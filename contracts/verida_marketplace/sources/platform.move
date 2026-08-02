module verida_marketplace::platform {
    use std::signer;
    use std::error;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use verida_marketplace::verida_marketplace;

    const ENOT_ENOUGH_COINS: u64 = 0;
    const EZERO_AMOUNT: u64 = 1;
    const EINVALID_RECIPIENT: u64 = 2;

    struct PaymentEvent has drop, store {
        payer: address,
        publisher: address,
        total_octas: u64,
        publisher_amount: u64,
        fee_amount: u64,
        dataset_id: u64,
    }

    public entry fun pay_with_fee(
        buyer: &signer,
        publisher: address,
        total_octas: u64,
        dataset_id: u64,
    ) {
        assert!(!verida_marketplace::is_paused(), error::invalid_state(EZERO_AMOUNT));
        assert!(total_octas > 0, error::invalid_argument(EZERO_AMOUNT));
        assert!(publisher != @0x0, error::invalid_argument(EINVALID_RECIPIENT));

        let treasury = verida_marketplace::get_treasury();
        let fee_bps = verida_marketplace::get_fee_basis_points();
        let fee = (total_octas * fee_bps) / 10_000;
        let publisher_amount = total_octas - fee;

        if (fee > 0) {
            coin::transfer<AptosCoin>(buyer, treasury, fee);
        };
        if (publisher_amount > 0) {
            coin::transfer<AptosCoin>(buyer, publisher, publisher_amount);
        };

        let _event = PaymentEvent {
            payer: signer::address_of(buyer),
            publisher,
            total_octas,
            publisher_amount,
            fee_amount: fee,
            dataset_id,
        };
        0; // placeholder for event emission via EventHandle in production
    }

    public fun calculate_fee(total_octas: u64): (u64, u64) {
        let fee_bps = verida_marketplace::get_fee_basis_points();
        let fee = (total_octas * fee_bps) / 10_000;
        (total_octas - fee, fee)
    }
}
