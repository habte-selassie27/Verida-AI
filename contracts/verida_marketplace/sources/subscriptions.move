module verida_marketplace::subscriptions {
    use std::signer;
    use std::vector;
    use std::error;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use verida_marketplace::verida_marketplace;

    const TIER_MONTHLY: u8 = 0;
    const TIER_QUARTERLY: u8 = 1;
    const TIER_ANNUAL: u8 = 2;

    const DURATION_MONTHLY: u64 = 2592000;
    const DURATION_QUARTERLY: u64 = 7776000;
    const DURATION_ANNUAL: u64 = 31536000;

    const EINVALID_TIER: u64 = 0;
    const EALREADY_SUBSCRIBED: u64 = 1;

    struct SubscriptionConfig has key {
        dataset_id: u64,
        publisher: address,
        monthly_price: u64,
        quarterly_price: u64,
        annual_price: u64,
    }

    struct Subscription has store {
        subscriber: address,
        tier: u8,
        started_at: u64,
        expires_at: u64,
        active: bool,
        payments_made: u64,
    }

    struct SubscriptionRegistry has key {
        subscriptions: vector<Subscription>,
    }

    fun init_module(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        if (!exists<SubscriptionRegistry>(admin_addr)) {
            move_to(admin, SubscriptionRegistry {
                subscriptions: vector::empty<Subscription>(),
            });
        };
    }

    public entry fun create_subscription_plan(
        admin: &signer,
        dataset_id: u64,
        publisher: address,
        monthly_price: u64,
        quarterly_price: u64,
        annual_price: u64,
    ) {
        assert!(!verida_marketplace::is_paused(), error::invalid_state(EINVALID_TIER));
        move_to(admin, SubscriptionConfig {
            dataset_id,
            publisher,
            monthly_price,
            quarterly_price,
            annual_price,
        });
    }

    public entry fun subscribe(
        buyer: &signer,
        config_addr: address,
        tier: u8,
    ) acquires SubscriptionConfig, SubscriptionRegistry {
        assert!(!verida_marketplace::is_paused(), error::invalid_state(EINVALID_TIER));
        assert!(tier <= TIER_ANNUAL, error::invalid_argument(EINVALID_TIER));

        let config = borrow_global<SubscriptionConfig>(config_addr);
        let registry = borrow_global_mut<SubscriptionRegistry>(@verida_marketplace);

        let (price, duration) = match_tier(tier, config);

        coin::transfer<AptosCoin>(buyer, config.publisher, price);

        let now = timestamp::now_seconds();
        vector::push_back(&mut registry.subscriptions, Subscription {
            subscriber: signer::address_of(buyer),
            tier,
            started_at: now,
            expires_at: now + duration,
            active: true,
            payments_made: 1,
        });
    }

    public entry fun renew(
        buyer: &signer,
        config_addr: address,
        tier: u8,
    ) acquires SubscriptionConfig, SubscriptionRegistry {
        let buyer_addr = signer::address_of(buyer);
        let config = borrow_global<SubscriptionConfig>(config_addr);
        let registry = borrow_global_mut<SubscriptionRegistry>(@verida_marketplace);

        let (price, duration) = match_tier(tier, config);
        coin::transfer<AptosCoin>(buyer, config.publisher, price);

        let len = vector::length(&registry.subscriptions);
        let i = 0;
        while (i < len) {
            let sub = vector::borrow_mut(&mut registry.subscriptions, i);
            if (sub.subscriber == buyer_addr && sub.tier == tier && sub.active) {
                sub.expires_at = sub.expires_at + duration;
                sub.payments_made = sub.payments_made + 1;
                return;
            };
            i = i + 1;
        };

        let now = timestamp::now_seconds();
        vector::push_back(&mut registry.subscriptions, Subscription {
            subscriber: buyer_addr,
            tier,
            started_at: now,
            expires_at: now + duration,
            active: true,
            payments_made: 1,
        });
    }

    public fun is_subscribed(subscriber: address): bool acquires SubscriptionRegistry {
        if (!exists<SubscriptionRegistry>(@verida_marketplace)) {
            return false;
        };
        let registry = borrow_global<SubscriptionRegistry>(@verida_marketplace);
        let now = timestamp::now_seconds();
        let len = vector::length(&registry.subscriptions);
        let i = 0;
        while (i < len) {
            let sub = vector::borrow(&registry.subscriptions, i);
            if (sub.subscriber == subscriber && sub.active && now < sub.expires_at) {
                return true;
            };
            i = i + 1;
        };
        false
    }

    public fun get_subscription_expiry(subscriber: address): u64 acquires SubscriptionRegistry {
        let registry = borrow_global<SubscriptionRegistry>(@verida_marketplace);
        let now = timestamp::now_seconds();
        let len = vector::length(&registry.subscriptions);
        let i = 0;
        while (i < len) {
            let sub = vector::borrow(&registry.subscriptions, i);
            if (sub.subscriber == subscriber && sub.active && now < sub.expires_at) {
                return sub.expires_at;
            };
            i = i + 1;
        };
        0
    }

    fun match_tier(tier: u8, config: &SubscriptionConfig): (u64, u64) {
        if (tier == TIER_MONTHLY) {
            (config.monthly_price, DURATION_MONTHLY)
        } else if (tier == TIER_QUARTERLY) {
            (config.quarterly_price, DURATION_QUARTERLY)
        } else {
            (config.annual_price, DURATION_ANNUAL)
        }
    }
}
