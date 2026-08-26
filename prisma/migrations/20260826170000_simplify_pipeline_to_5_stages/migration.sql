-- Simplifies the pipeline from 7 stages to 5: drops the separate "new
-- lead" and "confirmed" stages — every lead now starts at "booked"
-- (whether or not a call is actually on the calendar yet), and a booked
-- call is either showed or no-show, a showed call either closed or not.

UPDATE "Lead" SET "stage" = 'booked' WHERE "stage" IN ('new_lead', 'booked_unconfirmed', 'confirmed');
