module verida_marketplace::revenue {
    use std::signer;
    use std::vector;
    use std::error;
    use aptos_framework::timestamp;
    use verida_marketplace::verida_marketplace;

    const PAYMENT_ONE_TIME: u8 = 0;
    const PAYMENT_SUBSCRIPTION: u8 = 1;
    const PAYMENT_ESCROW_RELEASE: u8 = 2;

    const EINVALID_PAYMENT_TYPE: u64 = 0;

    struct PaymentEvent has store, drop {
        payer: address,
        payee: address,
        amount_octas: u64,
        fee_octas: u64,
        dataset_id: u64,
        payment_type: u8,
        timestamp: u64,
    }

    struct RevenueLedger has key {
        payments: vector<PaymentEvent>,
        total_platform_fees: u64,
    }

    fun init_module(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        if (!exists<RevenueLedger>(admin_addr)) {
            move_to(admin, RevenueLedger {
                payments: vector::empty<PaymentEvent>(),
                total_platform_fees: 0,
            });
        };
    }

    public entry fun record_payment(
        _caller: &signer,
        payer: address,
        payee: address,
        amount_octas: u64,
        fee_octas: u64,
        dataset_id: u64,
        payment_type: u8,
    ) acquires RevenueLedger {
        assert!(!verida_marketplace::is_paused(), error::invalid_state(EINVALID_PAYMENT_TYPE));
        assert!(payment_type <= PAYMENT_ESCROW_RELEASE, error::invalid_argument(EINVALID_PAYMENT_TYPE));

        let ledger = borrow_global_mut<RevenueLedger>(@verida_marketplace);
        ledger.total_platform_fees = ledger.total_platform_fees + fee_octas;

        vector::push_back(&mut ledger.payments, PaymentEvent {
            payer,
            payee,
            amount_octas,
            fee_octas,
            dataset_id,
            payment_type,
            timestamp: timestamp::now_seconds(),
        });
    }

    public fun get_publisher_revenue(publisher: address): u64 acquires RevenueLedger {
        let ledger = borrow_global<RevenueLedger>(@verida_marketplace);
        let total = 0u64;
        let len = vector::length(&ledger.payments);
        let i = 0;
        while (i < len) {
            let payment = vector::borrow(&ledger.payments, i);
            if (payment.payee == publisher) {
                total = total + payment.amount_octas;
            };
            i = i + 1;
        };
        total
    }

    public fun get_platform_fees(): u64 acquires RevenueLedger {
        let ledger = borrow_global<RevenueLedger>(@verida_marketplace);
        ledger.total_platform_fees
    }

    public fun get_publisher_transaction_count(publisher: address): u64 acquires RevenueLedger {
        let ledger = borrow_global<RevenueLedger>(@verida_marketplace);
        let count = 0u64;
        let len = vector::length(&ledger.payments);
        let i = 0;
        while (i < len) {
            let payment = vector::borrow(&ledger.payments, i);
            if (payment.payee == publisher) {
                count = count + 1;
            };
            i = i + 1;
        };
        count
    }
}
