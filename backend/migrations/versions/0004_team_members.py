from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"

def upgrade():
    op.add_column("content", sa.Column("created", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    # Department became required. Existing profiles get a starting value staff can change in the admin.
    op.execute("""UPDATE content SET data = (data::jsonb || jsonb_build_object('department',
        CASE WHEN concat(data->>'title', ' ', data->>'position') ~* '(principal|founder|director|partner)'
             THEN 'Leadership' ELSE 'Architecture' END))::json
        WHERE kind = 'team' AND data->>'department' IS NULL""")

def downgrade():
    op.drop_column("content", "created")
