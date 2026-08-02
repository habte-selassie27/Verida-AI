module verida_marketplace::ownership {
    use std::signer;
    use std::vector;
    use std::option::{Self, Option};
    use std::error;
    use aptos_framework::timestamp;
    use verida_marketplace::verida_marketplace;

    const ENOT_OWNER: u64 = 0;
    const EDATASET_NOT_FOUND: u64 = 1;
    const EDATASET_ALREADY_REGISTERED: u64 = 2;

    struct DatasetOwnership has store {
        dataset_id: u64,
        owner: address,
        created_at: u64,
        transfer_version: u64,
    }

    struct OwnershipRegistry has key {
        records: vector<DatasetOwnership>,
    }

    // Idempotent so module upgrades (which re-run init_module) don't abort on
    // the already-existing OwnershipRegistry.
    fun init_module(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        if (!exists<OwnershipRegistry>(admin_addr)) {
            move_to(admin, OwnershipRegistry {
                records: vector::empty<DatasetOwnership>(),
            });
        };
    }

    public entry fun register_dataset(
        publisher: &signer,
        dataset_id: u64,
    ) acquires OwnershipRegistry {
        assert!(!verida_marketplace::is_paused(), error::invalid_state(ENOT_OWNER));
        let registry = borrow_global_mut<OwnershipRegistry>(@verida_marketplace);
        let owner_addr = signer::address_of(publisher);

        let len = vector::length(&registry.records);
        let i = 0;
        while (i < len) {
            let record = vector::borrow(&registry.records, i);
            assert!(record.dataset_id != dataset_id, error::already_exists(EDATASET_ALREADY_REGISTERED));
            i = i + 1;
        };

        vector::push_back(&mut registry.records, DatasetOwnership {
            dataset_id,
            owner: owner_addr,
            created_at: timestamp::now_seconds(),
            transfer_version: 1,
        });
    }

    public entry fun transfer_ownership(
        current_owner: &signer,
        dataset_id: u64,
        new_owner: address,
    ) acquires OwnershipRegistry {
        assert!(!verida_marketplace::is_paused(), error::invalid_state(ENOT_OWNER));
        let registry = borrow_global_mut<OwnershipRegistry>(@verida_marketplace);
        let caller = signer::address_of(current_owner);
        let len = vector::length(&registry.records);
        let i = 0;
        let found = false;
        while (i < len) {
            let record = vector::borrow_mut(&mut registry.records, i);
            if (record.dataset_id == dataset_id && record.owner == caller) {
                record.owner = new_owner;
                record.transfer_version = record.transfer_version + 1;
                found = true;
            };
            i = i + 1;
        };
        assert!(found, error::not_found(ENOT_OWNER));
    }

    public fun get_owner(dataset_id: u64): Option<address> acquires OwnershipRegistry {
        let registry = borrow_global<OwnershipRegistry>(@verida_marketplace);
        let len = vector::length(&registry.records);
        let i = 0;
        while (i < len) {
            let record = vector::borrow(&registry.records, i);
            if (record.dataset_id == dataset_id) {
                return option::some(record.owner);
            };
            i = i + 1;
        };
        option::none()
    }

    public fun is_owner(caller: address, dataset_id: u64): bool acquires OwnershipRegistry {
        let registry = borrow_global<OwnershipRegistry>(@verida_marketplace);
        let len = vector::length(&registry.records);
        let i = 0;
        while (i < len) {
            let record = vector::borrow(&registry.records, i);
            if (record.dataset_id == dataset_id && record.owner == caller) {
                return true;
            };
            i = i + 1;
        };
        false
    }

    public fun get_transfer_version(dataset_id: u64): u64 acquires OwnershipRegistry {
        let registry = borrow_global<OwnershipRegistry>(@verida_marketplace);
        let len = vector::length(&registry.records);
        let i = 0;
        while (i < len) {
            let record = vector::borrow(&registry.records, i);
            if (record.dataset_id == dataset_id) {
                return record.transfer_version;
            };
            i = i + 1;
        };
        0
    }
}
