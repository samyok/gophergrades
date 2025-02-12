"""Removed class name as we generate from dept_abbr and course_num

Revision ID: b1d54180382a
Revises: 71a21ad5ca27
Create Date: 2024-04-26 21:49:07.754718

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b1d54180382a'
down_revision = '71a21ad5ca27'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('classdistribution', 'class_name')
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('classdistribution', sa.Column('class_name', sa.VARCHAR(length=10), nullable=False))
    # ### end Alembic commands ###
