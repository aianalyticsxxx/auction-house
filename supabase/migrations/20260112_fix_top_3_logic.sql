-- Fix place_bid function top 3 logic
-- The previous version had a bug where outbid_at was set before ranking,
-- which excluded those bids from the ranking calculation.

CREATE OR REPLACE FUNCTION place_bid(
    p_auction_id UUID,
    p_bidder_wallet TEXT,
    p_amount BIGINT
)
RETURNS bids AS $$
DECLARE
    v_auction auctions;
    v_bidder users;
    v_current_highest BIGINT;
    v_new_bid bids;
    v_anti_snipe_threshold INTERVAL := INTERVAL '60 seconds';
    v_anti_snipe_extension INTERVAL := INTERVAL '120 seconds';
BEGIN
    -- Get auction
    SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auction not found';
    END IF;

    -- Verify auction is current
    IF v_auction.status != 'current' THEN
        RAISE EXCEPTION 'Auction is not active';
    END IF;

    -- Get bidder
    SELECT * INTO v_bidder FROM users WHERE wallet_address = p_bidder_wallet;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Check if bidder is restricted
    IF v_bidder.is_restricted THEN
        RAISE EXCEPTION 'User is restricted from bidding';
    END IF;

    -- Get current highest bid
    SELECT COALESCE(MAX(amount), v_auction.reserve_price) INTO v_current_highest
    FROM bids WHERE auction_id = p_auction_id;

    -- Verify bid amount
    IF p_amount < v_current_highest + v_auction.min_bid_increment THEN
        RAISE EXCEPTION 'Bid must be at least % lamports', v_current_highest + v_auction.min_bid_increment;
    END IF;

    -- Create the bid
    INSERT INTO bids (auction_id, bidder_id, amount, collateral_locked)
    VALUES (p_auction_id, v_bidder.id, p_amount, p_amount / 10)
    RETURNING * INTO v_new_bid;

    -- Recalculate top 3 flags for ALL bids in this auction
    -- First reset all to false
    UPDATE bids
    SET is_top_3 = FALSE
    WHERE auction_id = p_auction_id;

    -- Then mark the top 3 by amount
    UPDATE bids
    SET is_top_3 = TRUE
    WHERE id IN (
        SELECT id
        FROM bids
        WHERE auction_id = p_auction_id
        ORDER BY amount DESC
        LIMIT 3
    );

    -- Mark bids outside top 3 as outbid (set timestamp if not already set)
    UPDATE bids
    SET outbid_at = COALESCE(outbid_at, NOW())
    WHERE auction_id = p_auction_id
    AND is_top_3 = FALSE
    AND outbid_at IS NULL;

    -- Anti-sniping: extend if bid within last 60 seconds
    IF v_auction.end_time - NOW() < v_anti_snipe_threshold THEN
        UPDATE auctions
        SET end_time = end_time + v_anti_snipe_extension
        WHERE id = p_auction_id;
    END IF;

    RETURN v_new_bid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
