#!/usr/bin/env node
/*
 * Database migrations for the Kalto Law Firestore database.
 *
 *   cd functions && npm install && cd ..                      (once: installs firebase-admin)
 *   node tools/migrate.js ~/keys/kalto-law-firebase.json --dry-run   preview, writes nothing
 *   node tools/migrate.js ~/keys/kalto-law-firebase.json             apply pending migrations
 *   node tools/migrate.js ~/keys/kalto-law-firebase.json --status    list applied / pending
 *
 * Options: --only 003 (run one migration), --force (run it again even if applied).
 *
 * Each file in tools/migrations/ runs once; applied migrations are recorded in
 * the "_migrations" collection (not readable by the website). Migrations are
 * written to be safe to repeat anyway.
 *
 * The key is a service-account key from Firebase console > Project settings >
 * Service accounts > Generate new private key. Keep it OUTSIDE this folder:
 * hosting deploys this folder publicly.
 *
 * Security rules and indexes are deployed separately:
 *   firebase deploy --only firestore,storage
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PROJECT_ID = 'kalto-law';
const args = process.argv.slice(2);
const flag = name => args.includes('--' + name);
const option = name => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : null; };
const dryRun = flag('dry-run');
const only = option('only');
const keyArg = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--only') || process.env.GOOGLE_APPLICATION_CREDENTIALS;

function loadMigrations() {
    const dir = path.join(__dirname, 'migrations');
    return fs.readdirSync(dir).filter(f => /^\d{3}-.+\.js$/.test(f)).sort().map(f => {
        const m = require(path.join(dir, f));
        return Object.assign({ id: f.replace(/\.js$/, '') }, m);
    });
}

function connect() {
    if (!keyArg) throw new Error('Pass the path to your service-account key file (see the top of tools/migrate.js).');
    const keyPath = path.resolve(keyArg.replace(/^~(?=$|\/)/, process.env.HOME || '~'));
    if (!fs.existsSync(keyPath)) throw new Error(`Key file not found: ${keyPath}`);
    if (keyPath.startsWith(ROOT + path.sep)) {
        throw new Error('The key file is inside the website folder, which is deployed publicly. Move it somewhere else (e.g. ~/keys/) and delete it from here.');
    }
    let admin;
    try { admin = require(path.join(ROOT, 'functions/node_modules/firebase-admin')); }
    catch (e) { throw new Error('firebase-admin is not installed. Run: cd functions && npm install'); }
    const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    if (key.project_id !== PROJECT_ID) throw new Error(`This key belongs to project "${key.project_id}", not "${PROJECT_ID}".`);
    admin.initializeApp({ credential: admin.credential.cert(key) });
    return { admin, db: admin.firestore() };
}

// Writes go through here so --dry-run writes nothing and big jobs stay under
// Firestore's 500-operations-per-batch limit.
function writer(db) {
    let ops = [];
    let count = 0;
    const flush = async () => {
        while (ops.length) {
            const batch = db.batch();
            ops.splice(0, 450).forEach(op => op(batch));
            if (!dryRun) await batch.commit();
        }
    };
    return {
        set(ref, data, opts) { count++; ops.push(b => opts ? b.set(ref, data, opts) : b.set(ref, data)); },
        update(ref, data) { count++; ops.push(b => b.update(ref, data)); },
        flush,
        get count() { return count; }
    };
}

async function main() {
    const migrations = loadMigrations();
    const { admin, db } = connect();
    const appliedSnap = await db.collection('_migrations').get();
    const applied = new Map(appliedSnap.docs.map(d => [d.id, d.data()]));

    if (flag('status')) {
        migrations.forEach(m => {
            const a = applied.get(m.id);
            console.log(`${a ? 'applied' : 'pending'}  ${m.id}  ${m.description}${a && a.appliedAt ? '  (' + a.appliedAt.toDate().toISOString().slice(0, 10) + ')' : ''}`);
        });
        return;
    }

    const toRun = migrations.filter(m => only ? m.id.startsWith(only) : !applied.has(m.id) || flag('force'));
    if (only && !toRun.length) throw new Error(`No migration matches "${only}".`);
    if (only && applied.has(toRun[0].id) && !flag('force')) {
        console.log(`${toRun[0].id} is already applied. Add --force to run it again.`);
        return;
    }
    if (!toRun.length) { console.log('Database is up to date. No pending migrations.'); return; }

    console.log(dryRun ? 'DRY RUN: nothing will be written.\n' : '');
    for (const m of toRun) {
        console.log(`▶ ${m.id}: ${m.description}`);
        const w = writer(db);
        const log = msg => console.log('    ' + msg);
        const summary = await m.up({ db, admin, write: w, log, dryRun });
        await w.flush();
        console.log(`  ${dryRun ? 'would write' : 'wrote'} ${w.count} document(s)${summary ? ': ' + summary : ''}\n`);
        if (!dryRun) {
            await db.collection('_migrations').doc(m.id).set({
                description: m.description,
                writes: w.count,
                summary: summary || '',
                appliedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    }
    console.log(dryRun ? 'Dry run finished. Run again without --dry-run to apply.' : 'All migrations applied.');
}

main().then(() => process.exit(0)).catch(err => { console.error('Error: ' + err.message); process.exit(1); });
