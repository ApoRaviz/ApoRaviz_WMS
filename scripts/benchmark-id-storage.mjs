// Reproducible storage comparison, not an application throughput benchmark.
// All writes belong to one randomly generated test schema; no public tables are read or changed.
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.loadEnvFile(resolve(root, '.env'));
const { Pool } = createRequire(resolve(root, 'backend/package.json'))('pg');
const schema = `test_idbench_${randomBytes(8).toString('hex')}`;
const pool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
  options: `-c search_path=${schema}`, max: 2, application_name: 'wms-id-storage-benchmark',
});
const parentRows = 100_000, linkRows = 400_000;
const variants = [
  { name: 'text_v4', type: 'text', field: 'v4::text' },
  { name: 'uuid_v7', type: 'uuid', field: 'v7' },
  { name: 'bigint_public', type: 'bigint', field: 'v7::text' },
];
try {
  await pool.query(`CREATE SCHEMA "${schema}"`);
  await pool.query('CREATE TABLE seed(n integer PRIMARY KEY,v4 uuid DEFAULT gen_random_uuid(),v7 uuid DEFAULT uuidv7())');
  await pool.query('INSERT INTO seed(n) SELECT generate_series(1,$1)', [parentRows]);
  const results = [];
  for (const variant of variants) {
    const parent = variant.name + '_parent', links = variant.name + '_links';
    const hybrid = variant.name === 'bigint_public';
    await pool.query(`CREATE TABLE ${parent} (${hybrid ? 'id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,public_id text NOT NULL UNIQUE' : `id ${variant.type} PRIMARY KEY`})`);
    await pool.query(`INSERT INTO ${parent}(${hybrid ? 'public_id' : 'id'}) SELECT ${variant.field} FROM seed ORDER BY n`);
    await pool.query(`CREATE TABLE ${links}(a ${variant.type} NOT NULL REFERENCES ${parent}(id),b ${variant.type} NOT NULL REFERENCES ${parent}(id),PRIMARY KEY(a,b))`);
    await pool.query(`CREATE INDEX ${links}_reverse_idx ON ${links}(b,a)`);
    const values = hybrid ? 'pa.id,pb.id' : `sa.${variant.field},sb.${variant.field}`;
    const mapping = hybrid ? `JOIN ${parent} pa ON pa.public_id=sa.v7::text JOIN ${parent} pb ON pb.public_id=sb.v7::text` : '';
    await pool.query(`INSERT INTO ${links}(a,b) SELECT ${values} FROM generate_series(0,$1::integer-1) g
      JOIN seed sa ON sa.n=(g % $2::integer)+1
      JOIN seed sb ON sb.n=((g*37 + g/$2::integer) % $2::integer)+1 ${mapping}`, [linkRows,parentRows]);
    await pool.query(`ANALYZE ${parent},${links}`);
    const sizes = (await pool.query(`SELECT pg_relation_size($1)::text parent_heap_bytes,pg_indexes_size($1)::text parent_index_bytes,
      pg_relation_size($2)::text link_heap_bytes,pg_indexes_size($2)::text link_index_bytes`, [parent,links])).rows[0];
    const lookup = (await pool.query(`SELECT ${hybrid ? 'public_id' : 'id'} lookup FROM ${parent} LIMIT 1`)).rows[0].lookup;
    const explain = (await pool.query(`EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT l.b FROM ${parent} p JOIN ${links} l ON l.a=p.id WHERE p.${hybrid ? 'public_id' : 'id'}=$1`, [lookup])).rows[0]['QUERY PLAN'][0];
    const nodes = [];
    const visit = plan => { nodes.push({type:plan['Node Type'],index:plan['Index Name']}); for (const child of plan.Plans ?? []) visit(child); };
    visit(explain.Plan);
    if (explain.Plan['Actual Rows'] !== 4 || !nodes.some(n=>n.index === `${links}_pkey`)) throw new Error('Expected four relationships via the primary index');
    results.push({variant:variant.name,...sizes,key_bytes:(await pool.query(`SELECT pg_column_size(id) bytes FROM ${parent} LIMIT 1`)).rows[0].bytes,lookup_plan:nodes});
  }
  console.log(JSON.stringify({server:(await pool.query('SHOW server_version')).rows[0].server_version,parent_rows:parentRows,link_rows:linkRows,
    note:'Synthetic fresh tables. BIGINT variant includes its public-ID unique index. No throughput or post-migration heap compaction claim.',results},null,2));
} finally {
  // Identifier is generated above, never supplied by a user or environment variable.
  try { await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); } finally { await pool.end(); }
}
