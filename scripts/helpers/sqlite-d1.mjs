import { DatabaseSync } from 'node:sqlite';

const d1RunResult = (result) => ({
  success: true,
  results: [],
  meta: {
    changes: Number(result.changes || 0),
    last_row_id: Number(result.lastInsertRowid || 0)
  }
});

const wrapStatement = (statement, parameters = []) => {
  const run = () => d1RunResult(statement.run(...parameters));
  return {
    bind: (...nextParameters) => wrapStatement(statement, nextParameters),
    run,
    all: () => ({ success: true, results: statement.all(...parameters), meta: { changes: 0 } }),
    first: () => statement.get(...parameters),
    executeBatch: run
  };
};

export const createSqliteD1 = () => {
  const sqlite = new DatabaseSync(':memory:', { enableForeignKeyConstraints: true });
  const database = {
    exec: (sql) => sqlite.exec(sql),
    prepare: (sql) => wrapStatement(sqlite.prepare(sql)),
    batch: async (statements) => {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const results = statements.map((statement) => statement.executeBatch());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    }
  };

  return {
    database,
    close: () => sqlite.close()
  };
};
