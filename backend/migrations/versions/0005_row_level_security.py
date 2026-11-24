from alembic import op

revision = "0005"
down_revision = "0004"

# Defence in depth for hosted Postgres such as Supabase: with RLS on and no policies, any role other
# than the table owner (which the API connects as) can read or write nothing, even if granted access.
TOGGLE = """DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = current_schema() LOOP
    EXECUTE format('ALTER TABLE %I.%I {} ROW LEVEL SECURITY', current_schema(), t.tablename);
  END LOOP; END $$"""

def upgrade():
    op.execute(TOGGLE.format("ENABLE"))

def downgrade():
    op.execute(TOGGLE.format("DISABLE"))
