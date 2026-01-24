-- Create place_bid function
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

    -- Mark previous bidder as outbid (if not in top 3)
    UPDATE bids
    SET outbid_at = NOW(), is_top_3 = FALSE
    WHERE auction_id = p_auction_id
    AND id != v_new_bid.id
    AND is_top_3 = FALSE;

    -- Update top 3 flags
    WITH ranked_bids AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY amount DESC) as rank
        FROM bids
        WHERE auction_id = p_auction_id AND outbid_at IS NULL
    )
    UPDATE bids
    SET is_top_3 = (ranked_bids.rank <= 3)
    FROM ranked_bids
    WHERE bids.id = ranked_bids.id;

    -- Anti-sniping: extend if bid within last 60 seconds
    IF v_auction.end_time - NOW() < v_anti_snipe_threshold THEN
        UPDATE auctions
        SET end_time = end_time + v_anti_snipe_extension
        WHERE id = p_auction_id;
    END IF;

    RETURN v_new_bid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
