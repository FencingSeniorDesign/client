// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_tidy_emma_frost.sql';
import m0001 from './0001_young_skrulls.sql';
import m0002 from './0002_clear_tinkerer.sql';
import m0003 from './0003_regular_callisto.sql';
import m0004 from './0004_elite_paper_doll.sql';
import m0005 from './0005_careful_amazoness.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003,
m0004,
m0005
    }
  }
  