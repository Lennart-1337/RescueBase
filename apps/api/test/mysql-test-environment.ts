import { execFileSync } from "node:child_process";

export async function createMysqlTestEnvironment(databaseName: string) {
  if (process.env.GITHUB_ACTIONS === "true") {
    return createGithubActionsEnvironment(databaseName);
  }

  const { MySqlContainer } = await import("@testcontainers/mysql");
  const container = await new MySqlContainer("mariadb:11.4")
    .withDatabase(databaseName)
    .withUsername("rescuebase")
    .withUserPassword("rescuebase")
    .withRootPassword("rescuebase-root")
    .start();

  return {
    databaseUrl: container.getConnectionUri(),
    stop: () => container.stop()
  };
}

async function createGithubActionsEnvironment(databaseName: string) {
  const rootUrl = "mysql://root:rescuebase-root@127.0.0.1:3306/rescuebase";
  const databaseUrl = `mysql://rescuebase:rescuebase@127.0.0.1:3306/${databaseName}`;
  executeSql(rootUrl, [
    `DROP DATABASE IF EXISTS \`${databaseName}\`;`,
    `CREATE DATABASE \`${databaseName}\`;`,
    `GRANT ALL PRIVILEGES ON \`${databaseName}\`.* TO 'rescuebase'@'%';`,
    "FLUSH PRIVILEGES;"
  ].join("\n"));

  return {
    databaseUrl,
    stop: async () => {
      executeSql(rootUrl, `DROP DATABASE IF EXISTS \`${databaseName}\`;`);
    }
  };
}

function executeSql(url: string, sql: string) {
  execFileSync("npx", ["prisma", "db", "execute", "--stdin"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: url },
    input: sql,
    stdio: ["pipe", "inherit", "inherit"]
  });
}
