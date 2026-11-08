-- Restores the rule dropped from 20261108140000: guaranteed pay for a year cannot exceed that year's total pay.
-- The two live rows that broke it were seed typos (x10) and have been corrected; the predicate was run verbatim against live first: 0 violations.
ALTER TABLE "ContractYear" ADD CONSTRAINT "ContractYear_guaranteed_within_total" CHECK ("guaranteedCents" <= "baseSalaryCents" + "rosterBonusCents" + "workoutBonusCents");
