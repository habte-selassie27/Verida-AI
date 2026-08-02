module verida_marketplace::verida_marketplace {
    use std::signer;
    use std::error;

    const ENOT_ADMIN: u64 = 0;
    const EALREADY_INITIALIZED: u64 = 1;

    struct MarketplaceConfig has key {
        admin: address,
        treasury: address,
        fee_basis_points: u64,
        paused: bool,
    }

    // Idempotent so module upgrades (which re-run init_module) don't abort on
    // the already-existing MarketplaceConfig.
    fun init_module(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        if (!exists<MarketplaceConfig>(admin_addr)) {
            move_to(admin, MarketplaceConfig {
                admin: admin_addr,
                treasury: admin_addr,
                fee_basis_points: 500,
                paused: false,
            });
        };
    }

    public entry fun set_treasury(admin: &signer, treasury: address) acquires MarketplaceConfig {
        let config = borrow_global_mut<MarketplaceConfig>(signer::address_of(admin));
        assert!(signer::address_of(admin) == config.admin, error::permission_denied(ENOT_ADMIN));
        config.treasury = treasury;
    }

    public entry fun set_fee(admin: &signer, fee_basis_points: u64) acquires MarketplaceConfig {
        let config = borrow_global_mut<MarketplaceConfig>(signer::address_of(admin));
        assert!(signer::address_of(admin) == config.admin, error::permission_denied(ENOT_ADMIN));
        assert!(fee_basis_points <= 1000, error::invalid_argument(ENOT_ADMIN));
        config.fee_basis_points = fee_basis_points;
    }

    public entry fun pause(admin: &signer) acquires MarketplaceConfig {
        let config = borrow_global_mut<MarketplaceConfig>(signer::address_of(admin));
        assert!(signer::address_of(admin) == config.admin, error::permission_denied(ENOT_ADMIN));
        config.paused = true;
    }

    public entry fun unpause(admin: &signer) acquires MarketplaceConfig {
        let config = borrow_global_mut<MarketplaceConfig>(signer::address_of(admin));
        assert!(signer::address_of(admin) == config.admin, error::permission_denied(ENOT_ADMIN));
        config.paused = false;
    }

    public fun is_paused(): bool acquires MarketplaceConfig {
        let config = borrow_global<MarketplaceConfig>(@verida_marketplace);
        config.paused
    }

    public fun get_treasury(): address acquires MarketplaceConfig {
        let config = borrow_global<MarketplaceConfig>(@verida_marketplace);
        config.treasury
    }

    public fun get_fee_basis_points(): u64 acquires MarketplaceConfig {
        let config = borrow_global<MarketplaceConfig>(@verida_marketplace);
        config.fee_basis_points
    }

    public fun get_admin(): address acquires MarketplaceConfig {
        let config = borrow_global<MarketplaceConfig>(@verida_marketplace);
        config.admin
    }
}
