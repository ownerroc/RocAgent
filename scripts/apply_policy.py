#!/usr/bin/env python3
import os, sys, subprocess
import snowflake.connector

account = os.environ.get('SNOWFLAKE_ACCOUNT')
user = os.environ.get('SNOWFLAKE_USER')
password = os.environ.get('SNOWFLAKE_PASSWORD')

if not all([account, user, password]):
    print('Missing SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER, or SNOWFLAKE_PASSWORD', file=sys.stderr)
    sys.exit(1)

# Detect current external IP (what Snowflake sees)
try:
    external_ip = subprocess.check_output(
        "curl -s https://api.ipify.org",
        shell=True, text=True, timeout=10
    ).strip()
    current_ip = external_ip if external_ip else '194.15.115.25'
except Exception:
    current_ip = '194.15.115.25'

print(f"📍 Current external IP (seen by Snowflake): {current_ip}")

try:
    conn = snowflake.connector.connect(
        user=user,
        account=account,
        password=password,
    )
    cur = conn.cursor()

    # Drop existing policy/rule if any
    for sql in [
        'DROP NETWORK RULE IF EXISTS ROCAGENT_ALLOWED_IPS;',
        'DROP NETWORK POLICY IF EXISTS ROCAGENT_PAT_POLICY;',
    ]:
        cur.execute(sql)

    # Create network rule for the current IP
    cur.execute(f"""
    CREATE OR REPLACE NETWORK RULE ROCAGENT_ALLOWED_IPS
      TYPE = 'IPV4'
      VALUE_LIST = ('{current_ip}');
    """)

    # Create network policy using the rule
    cur.execute("""
    CREATE OR REPLACE NETWORK POLICY ROCAGENT_PAT_POLICY
      ALLOWED_NETWORK_RULE_LIST = ('ROCAGENT_ALLOWED_IPS');
    """)

    # Assign policy to the user
    cur.execute(f"ALTER USER {user} SET NETWORK_POLICY = ROCAGENT_PAT_POLICY;")

    # Verify
    for sql in [
        'SHOW NETWORK POLICIES;',
        'SHOW NETWORK RULES;',
        f'DESC USER {user};',
    ]:
        print(sql)
        cur.execute(sql)
        rows = cur.fetchall()
        if rows:
            for row in rows:
                print(row)

    print('✅ Snowflake network policy applied successfully.')
    cur.close()
    conn.close()
except Exception as e:
    print('❌ Failed to apply policy:', e, file=sys.stderr)
    sys.exit(1)