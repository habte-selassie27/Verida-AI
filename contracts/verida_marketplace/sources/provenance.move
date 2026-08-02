module verida_marketplace::provenance {
    use std::signer;
    use std::vector;
    use std::string::String;
    use std::error;
    use aptos_framework::timestamp;
    use verida_marketplace::verida_marketplace;

    const EVENT_UPLOAD: u8 = 0;
    const EVENT_VERSION_ADDED: u8 = 1;
    const EVENT_VERIFIED: u8 = 2;
    const EVENT_TAMPER_DETECTED: u8 = 3;
    const EVENT_ACCESSED: u8 = 4;
    const EVENT_OWNERSHIP_TRANSFERRED: u8 = 5;

    const EINVALID_EVENT_TYPE: u64 = 0;

    struct ProvenanceEvent has store, drop, copy {
        dataset_id: u64,
        version: u64,
        event_type: u8,
        actor: address,
        timestamp: u64,
        metadata: String,
    }

    struct ProvenanceChain has key {
        events: vector<ProvenanceEvent>,
    }

    fun init_module(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        if (!exists<ProvenanceChain>(admin_addr)) {
            move_to(admin, ProvenanceChain {
                events: vector::empty<ProvenanceEvent>(),
            });
        };
    }

    public entry fun emit_event(
        emitter: &signer,
        dataset_id: u64,
        version: u64,
        event_type: u8,
        metadata: String,
    ) acquires ProvenanceChain {
        assert!(!verida_marketplace::is_paused(), error::invalid_state(EINVALID_EVENT_TYPE));
        assert!(event_type <= EVENT_OWNERSHIP_TRANSFERRED, error::invalid_argument(EINVALID_EVENT_TYPE));

        let chain = borrow_global_mut<ProvenanceChain>(@verida_marketplace);
        vector::push_back(&mut chain.events, ProvenanceEvent {
            dataset_id,
            version,
            event_type,
            actor: signer::address_of(emitter),
            timestamp: timestamp::now_seconds(),
            metadata,
        });
    }

    public fun get_events(dataset_id: u64): vector<ProvenanceEvent> acquires ProvenanceChain {
        let chain = borrow_global<ProvenanceChain>(@verida_marketplace);
        let result = vector::empty<ProvenanceEvent>();
        let len = vector::length(&chain.events);
        let i = 0;
        while (i < len) {
            let event = vector::borrow(&chain.events, i);
            if (event.dataset_id == dataset_id) {
                vector::push_back(&mut result, *event);
            };
            i = i + 1;
        };
        result
    }

    public fun get_event_count(dataset_id: u64): u64 acquires ProvenanceChain {
        let chain = borrow_global<ProvenanceChain>(@verida_marketplace);
        let count = 0u64;
        let len = vector::length(&chain.events);
        let i = 0;
        while (i < len) {
            let event = vector::borrow(&chain.events, i);
            if (event.dataset_id == dataset_id) {
                count = count + 1;
            };
            i = i + 1;
        };
        count
    }
}
