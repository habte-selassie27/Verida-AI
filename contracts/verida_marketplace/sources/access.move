module verida_marketplace::access {
    use std::signer;
    use std::vector;
    use std::error;
    use aptos_framework::timestamp;
    use verida_marketplace::verida_marketplace;

    const EACCESS_NOT_FOUND: u64 = 0;
    const EACCESS_EXPIRED: u64 = 1;
    const EACCESS_ALREADY_EXISTS: u64 = 2;

    struct AccessGrant has store {
        dataset_id: u64,
        accessor: address,
        granted_at: u64,
        expires_at: u64,
        revoked: bool,
    }

    struct AccessRegistry has key {
        grants: vector<AccessGrant>,
    }

    // Idempotent so module upgrades (which re-run init_module) don't abort on
    // the already-existing AccessRegistry.
    fun init_module(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        if (!exists<AccessRegistry>(admin_addr)) {
            move_to(admin, AccessRegistry {
                grants: vector::empty<AccessGrant>(),
            });
        };
    }

    public entry fun grant_access(
        admin: &signer,
        accessor: address,
        dataset_id: u64,
        duration_seconds: u64,
    ) acquires AccessRegistry {
        assert!(!verida_marketplace::is_paused(), error::invalid_state(EACCESS_NOT_FOUND));
        let registry = borrow_global_mut<AccessRegistry>(@verida_marketplace);
        let now = timestamp::now_seconds();

        vector::push_back(&mut registry.grants, AccessGrant {
            dataset_id,
            accessor,
            granted_at: now,
            expires_at: now + duration_seconds,
            revoked: false,
        });
    }

    public entry fun revoke_access(
        admin: &signer,
        accessor: address,
        dataset_id: u64,
    ) acquires AccessRegistry {
        let registry = borrow_global_mut<AccessRegistry>(@verida_marketplace);
        let len = vector::length(&registry.grants);
        let i = 0;
        while (i < len) {
            let grant = vector::borrow_mut(&mut registry.grants, i);
            if (grant.accessor == accessor && grant.dataset_id == dataset_id && !grant.revoked) {
                grant.revoked = true;
            };
            i = i + 1;
        };
    }

    public fun has_access(accessor: address, dataset_id: u64): bool acquires AccessRegistry {
        if (!exists<AccessRegistry>(@verida_marketplace)) {
            return false;
        };
        let registry = borrow_global<AccessRegistry>(@verida_marketplace);
        let now = timestamp::now_seconds();
        let len = vector::length(&registry.grants);
        let i = 0;
        while (i < len) {
            let grant = vector::borrow(&registry.grants, i);
            if (grant.accessor == accessor
                && grant.dataset_id == dataset_id
                && !grant.revoked
                && now < grant.expires_at) {
                return true;
            };
            i = i + 1;
        };
        false
    }

    public fun get_access_expiry(accessor: address, dataset_id: u64): u64 acquires AccessRegistry {
        let registry = borrow_global<AccessRegistry>(@verida_marketplace);
        let len = vector::length(&registry.grants);
        let i = 0;
        while (i < len) {
            let grant = vector::borrow(&registry.grants, i);
            if (grant.accessor == accessor && grant.dataset_id == dataset_id && !grant.revoked) {
                return grant.expires_at;
            };
            i = i + 1;
        };
        0
    }
}
