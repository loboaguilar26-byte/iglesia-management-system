ALTER TABLE "giving_report"
  ADD CONSTRAINT "giving_report_amount_positive" CHECK ("amount" > 0);

ALTER TABLE "expense"
  ADD CONSTRAINT "expense_amount_positive" CHECK ("amount" > 0);

CREATE FUNCTION financial_record_no_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Financial records cannot be deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER giving_report_no_delete
BEFORE DELETE ON "giving_report"
FOR EACH ROW EXECUTE FUNCTION financial_record_no_delete();

CREATE TRIGGER expense_no_delete
BEFORE DELETE ON "expense"
FOR EACH ROW EXECUTE FUNCTION financial_record_no_delete();
