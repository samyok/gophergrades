"""Added SRT JSON Object to Class Distributions

Revision ID: 277a6d58ebd5
Revises: bde13d04cf22
Create Date: 2023-06-10 15:13:26.904933

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '277a6d58ebd5'
down_revision = 'bde13d04cf22'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('classdistribution', sa.Column('srt_vals', sa.JSON(), nullable=True))
    op.drop_column('classdistribution', 'recommend')
    op.drop_column('classdistribution', 'effort')
    op.drop_column('classdistribution', 'deep_und')
    op.drop_column('classdistribution', 'acc_sup')
    op.drop_column('classdistribution', 'tech_eff')
    op.drop_column('classdistribution', 'grad_stand')
    op.drop_column('classdistribution', 'responses')
    op.drop_column('classdistribution', 'stim_int')
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('classdistribution', sa.Column('stim_int', sa.FLOAT(), nullable=True))
    op.add_column('classdistribution', sa.Column('responses', sa.INTEGER(), nullable=True))
    op.add_column('classdistribution', sa.Column('grad_stand', sa.FLOAT(), nullable=True))
    op.add_column('classdistribution', sa.Column('tech_eff', sa.FLOAT(), nullable=True))
    op.add_column('classdistribution', sa.Column('acc_sup', sa.FLOAT(), nullable=True))
    op.add_column('classdistribution', sa.Column('deep_und', sa.FLOAT(), nullable=True))
    op.add_column('classdistribution', sa.Column('effort', sa.FLOAT(), nullable=True))
    op.add_column('classdistribution', sa.Column('recommend', sa.FLOAT(), nullable=True))
    op.drop_column('classdistribution', 'srt_vals')
    # ### end Alembic commands ###