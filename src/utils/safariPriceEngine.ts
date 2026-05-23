export const calculateSafariPrice = (
    roomTotal: number = 0, // Fallback to 0
    adults: number = 2, 
    childAges: number[] = [], 
    stayNights: number = 1,
    config: any = {}
) => {
    // 1. Safety Guards (Prevents NaN)
    const safeNights = stayNights > 0 ? stayNights : 1;
    const levy = config?.levy_cons_pppn_zar || 210;
    const isSingle = adults === 1 && (!childAges || childAges.length === 0);

    // 2. Weighting Logic
    let weight = adults;
    childAges.forEach(age => {
        weight += (age <= (config?.weight_child_minor_age_max || 11)) ? 0.5 : 1;
    });
    if (isSingle) weight = config?.weight_single_occupancy || 1;
    
    // Ensure weight is never zero
    const safeWeight = weight > 0 ? weight : 1;

    // 3. The Math
    const dailyTotal = roomTotal / safeNights;
    const bareAdultPPS = dailyTotal / safeWeight;

    // 4. Value Metrics (Dynamic Policy & Genius Auto-Beat)
    const otaCommissionRate = config?.ota_commission_rate || 0.15;
    const heroMultiplier = config?.hero_guarantee_multiplier || 0.95;
    const geniusMultiplier = config?.geniusMultiplier ?? 1.0;

    // 5. Final Calculations
    const totalPeople = adults + childAges.length;
    const totalLevies = totalPeople * levy * safeNights;
    
    // Auto-beat implementation:
    // If the OTA features a Genius/mobile discount, the baseline is already reduced.
    // The Hero rate is guaranteed to always beat the Genius/OTA price by an additional 5%!
    const otaBaseTotal = roomTotal * geniusMultiplier;
    const heroBaseTotal = otaBaseTotal * heroMultiplier;

    const marketTotalStay = otaBaseTotal + totalLevies;
    const heroTotalStay = heroBaseTotal + totalLevies;

    // What the GUEST saves (Member Saving)
    const guestSavingTotal = marketTotalStay - heroTotalStay;
    
    // What the LODGE saves (Conservation Fuel)
    // The lodge keeps the commission that would have gone to the OTA (based on the ota rate),
    // minus the guest's member saving discount.
    const conservationFuelTotal = (otaBaseTotal * otaCommissionRate) - guestSavingTotal;

    return {
        heroPrice: (bareAdultPPS * geniusMultiplier * heroMultiplier) + levy, 
        totalStayCost: heroTotalStay,
        marketTotalStay: marketTotalStay,
        displayLabel: isSingle ? "Single Rate" : "PPS",
        isSingle: isSingle,
        barePPS: bareAdultPPS, 
        weight: safeWeight,
        memberSaving: guestSavingTotal,
        conservationFuel: conservationFuelTotal,
        totalBenefit: guestSavingTotal + conservationFuelTotal,
        breakdown: {
            adultRate: bareAdultPPS * geniusMultiplier * heroMultiplier,
            childRate: (bareAdultPPS * 0.5) * geniusMultiplier * heroMultiplier,
            levy: levy,
            adults: adults,
            children: childAges.length,
            totalPeople: totalPeople,
            nights: safeNights
        }
    };
};