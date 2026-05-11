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

    // 4. Value Metrics (Dynamic Policy)
    const otaCommissionRate = config?.ota_commission_rate || 0.15;
    const memberDiscountRate = config?.member_discount_rate || 0.05;
    const heroMultiplier = config?.hero_guarantee_multiplier || 0.95;

    // 5. Final Calculations
    const totalPeople = adults + childAges.length;
    const totalLevies = totalPeople * levy * safeNights;
    
    const marketTotalStay = roomTotal + totalLevies;
    const heroTotalStay = (roomTotal * heroMultiplier) + totalLevies;

    // What the GUEST saves (Member Saving)
    const guestSavingTotal = (bareAdultPPS * (1 - heroMultiplier)) * safeWeight * safeNights;
    
    // What the LODGE saves (Conservation Fuel)
    // The lodge keeps the commission that would have gone to the OTA, minus the guest discount
    const conservationFuelTotal = (roomTotal * otaCommissionRate) - guestSavingTotal;

    return {
        heroPrice: (bareAdultPPS * heroMultiplier) + levy, 
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
            adultRate: bareAdultPPS * heroMultiplier,
            childRate: (bareAdultPPS * 0.5) * heroMultiplier,
            levy: levy,
            adults: adults,
            children: childAges.length,
            totalPeople: totalPeople,
            nights: safeNights
        }
    };
};