module verida_marketplace::escrow {
    use std::signer;
    use std::vector;
    use std::error;
    use aptos_framework::coin::{Self as coin, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use verida_marketplace::verida_marketplace;
    use verida_marketplace::platform;

    const DISPUTE_WINDOW_SECONDS: u64 = 604800;
    const STATUS_PENDING: u8 = 0;
    const STATUS_RELEASED: u8 = 1;
    const STATUS_DISPUTED: u8 = 2;
    const STATUS_REFUNDED: u8 = 3;

    const ENOT_BUYER: u64 = 0;
    const EINVALID_STATUS: u64 = 1;
    const EESCROW_NOT_FOUND: u64 = 2;
    const EDISPUTE_WINDOW_NOT_EXPIRED: u64 = 3;
    const EINSUFFICIENT_VAULT_BALANCE: u64 = 4;
    const EZERO_AMOUNT: u64 = 5;
    const EINVALID_RECIPIENT: u64 = 6;
    const ENOT_ADMIN: u64 = 7;

    struct EscrowEntry has store {
        id: u64,
        buyer: address,
        publisher: address,
        dataset_id: u64,
        amount_octas: u64,
        created_at: u64,
        status: u8,
    }

    struct EscrowConfig has key {
        next_id: u64,
        dispute_window: u64,
    }

    // NOTE: Layout is frozen by the deployed module — do NOT add fields here,
    // or upgrades will be rejected as BACKWARD_INCOMPATIBLE_MODULE_UPDATE.
    // The escrowed APT lives in `EscrowVaultCoins` instead, so only this module
    // can move the funds (deposit, confirm_release, auto_release, refund).
    struct EscrowVault has key {
        entries: vector<EscrowEntry>,
    }

    // Module-managed coin vault holding every pending escrow's APT. Kept as a
    // separate resource so it can be added via upgrade without touching the
    // frozen `EscrowVault` layout.
    struct EscrowVaultCoins has key {
        coins: Coin<AptosCoin>,
    }

    fun init_module(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        if (!exists<EscrowConfig>(admin_addr)) {
            move_to(admin, EscrowConfig {
                next_id: 1,
                dispute_window: DISPUTE_WINDOW_SECONDS,
            });
        };
        if (!exists<EscrowVault>(admin_addr)) {
            move_to(admin, EscrowVault {
                entries: vector::empty<EscrowEntry>(),
            });
        };
        if (!exists<EscrowVaultCoins>(admin_addr)) {
            move_to(admin, EscrowVaultCoins {
                coins: coin::zero<AptosCoin>(),
            });
        };
    }

    public entry fun deposit(
        buyer: &signer,
        publisher: address,
        dataset_id: u64,
        amount_octas: u64,
    ) acquires EscrowVault, EscrowConfig, EscrowVaultCoins {
        assert!(!verida_marketplace::is_paused(), error::invalid_state(EINVALID_STATUS));
        assert!(amount_octas > 0, error::invalid_argument(EZERO_AMOUNT));
        assert!(publisher != @0x0, error::invalid_argument(EINVALID_RECIPIENT));

        let buyer_addr = signer::address_of(buyer);
        let vault = borrow_global_mut<EscrowVault>(@verida_marketplace);
        let config = borrow_global_mut<EscrowConfig>(@verida_marketplace);

        let entry_id = config.next_id;
        config.next_id = entry_id + 1;

        // Pull the coins out of the buyer's balance and hold them in the vault.
        let coins_vault = borrow_global_mut<EscrowVaultCoins>(@verida_marketplace);
        let coins = coin::withdraw<AptosCoin>(buyer, amount_octas);
        coin::merge(&mut coins_vault.coins, coins);

        vector::push_back(&mut vault.entries, EscrowEntry {
            id: entry_id,
            buyer: buyer_addr,
            publisher,
            dataset_id,
            amount_octas,
            created_at: timestamp::now_seconds(),
            status: STATUS_PENDING,
        });
    }

    public entry fun confirm_release(
        buyer: &signer,
        escrow_id: u64,
    ) acquires EscrowVault, EscrowVaultCoins {
        let buyer_addr = signer::address_of(buyer);
        let vault = borrow_global_mut<EscrowVault>(@verida_marketplace);
        let entry = find_escrow_mut(&mut vault.entries, escrow_id);
        assert!(entry.buyer == buyer_addr, error::permission_denied(ENOT_BUYER));
        assert!(entry.status == STATUS_PENDING, error::invalid_state(EINVALID_STATUS));

        // Copy primitives out before touching the vault again — the `entry`
        // borrow must be dead before `vault` is re-borrowed.
        let publisher = entry.publisher;
        let amount_octas = entry.amount_octas;
        entry.status = STATUS_RELEASED;
        release_funds(publisher, amount_octas);
    }

    public entry fun open_dispute(
        buyer: &signer,
        escrow_id: u64,
    ) acquires EscrowVault {
        let buyer_addr = signer::address_of(buyer);
        let vault = borrow_global_mut<EscrowVault>(@verida_marketplace);
        let entry = find_escrow_mut(&mut vault.entries, escrow_id);
        assert!(entry.buyer == buyer_addr, error::permission_denied(ENOT_BUYER));
        assert!(entry.status == STATUS_PENDING, error::invalid_state(EINVALID_STATUS));

        entry.status = STATUS_DISPUTED;
    }

    public entry fun auto_release(
        _caller: &signer,
        escrow_id: u64,
    ) acquires EscrowVault, EscrowConfig, EscrowVaultCoins {
        let config = borrow_global<EscrowConfig>(@verida_marketplace);
        let vault = borrow_global_mut<EscrowVault>(@verida_marketplace);
        let entry = find_escrow_mut(&mut vault.entries, escrow_id);
        assert!(entry.status == STATUS_PENDING, error::invalid_state(EINVALID_STATUS));
        assert!(
            timestamp::now_seconds() >= entry.created_at + config.dispute_window,
            error::invalid_state(EDISPUTE_WINDOW_NOT_EXPIRED)
        );

        // Copy primitives out so `entry`'s borrow ends before `vault` is used.
        let publisher = entry.publisher;
        let amount_octas = entry.amount_octas;
        entry.status = STATUS_RELEASED;
        release_funds(publisher, amount_octas);
    }

    // One-time setup for upgraded deployments: init_module does NOT re-run on
    // upgrades, so the module-owned coin vault must be created explicitly.
    // Idempotent — safe to call repeatedly. Only @verida_marketplace may call it.
    public entry fun initialize_vault(
        admin: &signer,
    ) {
        assert!(
            signer::address_of(admin) == @verida_marketplace,
            error::permission_denied(ENOT_ADMIN)
        );
        if (!exists<EscrowVaultCoins>(@verida_marketplace)) {
            move_to(admin, EscrowVaultCoins {
                coins: coin::zero<AptosCoin>(),
            });
        };
    }

    // Governance: lets the module owner shorten the dispute window. Used to
    // make the auto-release lifecycle testable (and, in production, to react
    // to support incidents). Only @verida_marketplace may call it.
    public entry fun set_dispute_window(
        admin: &signer,
        new_window: u64,
    ) acquires EscrowConfig {
        assert!(
            signer::address_of(admin) == @verida_marketplace,
            error::permission_denied(ENOT_ADMIN)
        );
        assert!(new_window > 0, error::invalid_argument(EZERO_AMOUNT));
        borrow_global_mut<EscrowConfig>(@verida_marketplace).dispute_window = new_window;
    }

    public entry fun refund(
        _admin: &signer,
        escrow_id: u64,
    ) acquires EscrowVault, EscrowVaultCoins {
        let vault = borrow_global_mut<EscrowVault>(@verida_marketplace);
        let entry = find_escrow_mut(&mut vault.entries, escrow_id);
        assert!(
            entry.status == STATUS_DISPUTED || entry.status == STATUS_PENDING,
            error::invalid_state(EINVALID_STATUS)
        );

        // Copy primitives out so `entry`'s borrow ends before `vault` is used.
        let buyer = entry.buyer;
        let amount_octas = entry.amount_octas;
        entry.status = STATUS_REFUNDED;

        let coins_vault = borrow_global_mut<EscrowVaultCoins>(@verida_marketplace);
        assert!(
            coin::value(&coins_vault.coins) >= amount_octas,
            error::invalid_state(EINSUFFICIENT_VAULT_BALANCE)
        );

        let refund_coins = coin::extract(&mut coins_vault.coins, amount_octas);
        coin::deposit(buyer, refund_coins);
    }

    // Splits the escrowed amount between the publisher (net of the platform
    // fee) and the treasury, mirroring platform::pay_with_fee. Funds come from
    // the module-managed coin vault, so no caller signer is required.
    fun release_funds(publisher: address, total_octas: u64) acquires EscrowVaultCoins {
        let coins_vault = borrow_global_mut<EscrowVaultCoins>(@verida_marketplace);
        assert!(
            coin::value(&coins_vault.coins) >= total_octas,
            error::invalid_state(EINSUFFICIENT_VAULT_BALANCE)
        );

        let (publisher_amount, fee_amount) = platform::calculate_fee(total_octas);

        if (fee_amount > 0) {
            let treasury = verida_marketplace::get_treasury();
            let fee_coins = coin::extract(&mut coins_vault.coins, fee_amount);
            coin::deposit(treasury, fee_coins);
        };
        if (publisher_amount > 0) {
            let publisher_coins = coin::extract(&mut coins_vault.coins, publisher_amount);
            coin::deposit(publisher, publisher_coins);
        };
    }

    public fun get_escrow_status(escrow_id: u64): u8 acquires EscrowVault {
        let vault = borrow_global<EscrowVault>(@verida_marketplace);
        let len = vector::length(&vault.entries);
        let i = 0;
        while (i < len) {
            let entry = vector::borrow(&vault.entries, i);
            if (entry.id == escrow_id) {
                return entry.status;
            };
            i = i + 1;
        };
        4
    }

    public fun get_escrow_deadline(escrow_id: u64): u64 acquires EscrowVault, EscrowConfig {
        let config = borrow_global<EscrowConfig>(@verida_marketplace);
        let vault = borrow_global<EscrowVault>(@verida_marketplace);
        let len = vector::length(&vault.entries);
        let i = 0;
        while (i < len) {
            let entry = vector::borrow(&vault.entries, i);
            if (entry.id == escrow_id) {
                return entry.created_at + config.dispute_window;
            };
            i = i + 1;
        };
        0
    }

    fun find_escrow_mut(entries: &mut vector<EscrowEntry>, escrow_id: u64): &mut EscrowEntry {
        let len = vector::length(entries);
        let i = 0;
        while (i < len) {
            let entry = vector::borrow_mut(entries, i);
            if (entry.id == escrow_id) {
                return entry;
            };
            i = i + 1;
        };
        abort EESCROW_NOT_FOUND
    }
}
