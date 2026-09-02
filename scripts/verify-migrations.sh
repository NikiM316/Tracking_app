#!/usr/bin/env bash
# Verifies that the exported migration files in supabase/migrations/ are byte-identical
# to the statements recorded in the live project's supabase_migrations.schema_migrations.
#
# Expected checksums were captured from the live project on 2026-09-02. Each migration
# has two accepted hashes: the raw stored statement, and the same string plus the
# trailing newline that files conventionally end with.
#
# Usage: bash scripts/verify-migrations.sh

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

# version|md5_without_trailing_newline|md5_with_trailing_newline
EXPECTED="
20260805080419_add_rest_seconds_to_sets|eb92cf903e508c0a3bcb567cefa3cbde|05ca5686605091d8bceaa01ccb953273
20260805101104_add_water_ml_to_workouts|c1e86e074b3968c0fd87e552a5fa8f3f|a71715a45770356511e4914f434dbd88
20260805101128_add_increment_workout_water_function|93b848d0633af82ad08626145812f4a1|856e097b789c69f93ad07b9b36fb16b9
20260807073531_create_finance_schema|0bb849203e114476195e987b08f99063|908f52cada56e75d953eaeb5d1fac133
20260807073934_seed_finance_defaults_for_placeholder_user|de691daf1ef2dbdbbea49c66212d5424|1cda2113a9f2a904674b7b4357a1e015
20260820083115_create_monk_mode_schema|102e73057afb36cfef5c0200fd9b4313|6a6dd0e5ce1673d6e68eef3c39d439b8
20260820083303_harden_monk_schema|ccc7d4780e8187760abcb786fe6ab481|1259760ed278f7ef8ef0f7e166b8cb9b
20260827120407_add_is_completed_to_study_plan_weeks|c56389e756ccd711c0a60fddd59ac5f5|b9d86977f0a73abbae08afbf8600f243
20260827121237_add_is_completed_to_study_plan_items|46d986702643ecd9c53e189ecb07a198|a34d49aaa264c05229b07a1edcb27099
20260829113701_add_gaming_minutes_to_monk_days|bd99af9ac9292f8d406fc4fba52162bd|12a7a89b667d1d59985fe28f922b8396
"

if command -v md5 >/dev/null 2>&1; then
  hash_file() { md5 -q "$1"; }
else
  hash_file() { md5sum "$1" | cut -d' ' -f1; }
fi

pass=0
fail=0

while IFS='|' read -r name want_raw want_nl; do
  [ -z "$name" ] && continue
  file="supabase/migrations/${name}.sql"

  if [ ! -f "$file" ]; then
    echo "MISSING  ${name}.sql"
    fail=$((fail + 1))
    continue
  fi

  got=$(hash_file "$file")
  if [ "$got" = "$want_raw" ] || [ "$got" = "$want_nl" ]; then
    echo "OK       ${name}.sql"
    pass=$((pass + 1))
  else
    echo "MISMATCH ${name}.sql (got $got)"
    fail=$((fail + 1))
  fi
done <<< "$EXPECTED"

echo
echo "${pass} matched, ${fail} failed"
[ "$fail" -eq 0 ] || exit 1
