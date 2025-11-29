const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'mobile_provider_db',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: true,
    trustServerCertificate: true, // Changed to true for Azure SQL
    enableArithAbort: true,
    connectionTimeout: 30000,
    requestTimeout: 30000
  },
  port: parseInt(process.env.DB_PORT || '1433'),
  pool: {
    max: 20,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let poolPromise;

const getPool = async () => {
  if (!poolPromise) {
    poolPromise = sql.connect(config);
  }
  return poolPromise;
};

const query = async (queryText, params = []) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    
    // Convert PostgreSQL $1 syntax to @param1
    if (params && params.length > 0) {
      params.forEach((value, index) => {
        if (typeof value === 'boolean') {
          request.input(`param${index + 1}`, sql.Bit, value ? 1 : 0);
        } else {
          request.input(`param${index + 1}`, value);
        }
      });
      queryText = queryText.replace(/\$(\d+)/g, '@param$1');
    }
    
    // Convert hardcoded boolean values (true/false) to 1/0
    queryText = queryText.replace(/\b(=|!=|<>)\s*(true|false)\b/gi, (match, op, bool) => {
      return `${op} ${bool.toLowerCase() === 'true' ? '1' : '0'}`;
    });
    
    // Convert PostgreSQL LIMIT/OFFSET to T-SQL OFFSET...FETCH or TOP
    // Handle LIMIT with OFFSET (pagination): LIMIT @param2 OFFSET @param3
    if (queryText.match(/\bLIMIT\s+@param\d+\s+OFFSET\s+@param\d+/i)) {
      queryText = queryText.replace(/\bLIMIT\s+(@param\d+)\s+OFFSET\s+(@param\d+)/i, 
        'OFFSET $2 ROWS FETCH NEXT $1 ROWS ONLY');
    } 
    // Handle simple LIMIT: LIMIT 1 or LIMIT @param1
    else {
      const limitMatch = queryText.match(/\bLIMIT\s+(\d+|@param\d+)/i);
      if (limitMatch) {
        const limitValue = limitMatch[1];
        queryText = queryText.replace(/\bSELECT\b/i, `SELECT TOP ${limitValue}`);
        queryText = queryText.replace(/\bLIMIT\s+(\d+|@param\d+)/gi, '');
      }
    }
    
    const result = await request.query(queryText);
    return {
      rows: result.recordset || [],
      rowCount: result.rowsAffected[0] || 0
    };
  } catch (err) {
    console.error('Query error:', err);
    throw err;
  }
};

const connect = async () => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  
  return {
    query: async (queryText, params = []) => {
      const request = new sql.Request(transaction);
      
      // Convert PostgreSQL $1 syntax to @param1
      if (params && params.length > 0) {
        params.forEach((value, index) => {
          if (typeof value === 'boolean') {
            request.input(`param${index + 1}`, sql.Bit, value ? 1 : 0);
          } else {
            request.input(`param${index + 1}`, value);
          }
        });
        queryText = queryText.replace(/\$(\d+)/g, '@param$1');
      }
      
      // Convert hardcoded boolean values (true/false) to 1/0
      queryText = queryText.replace(/\b(=|!=|<>)\s*(true|false)\b/gi, (match, op, bool) => {
        return `${op} ${bool.toLowerCase() === 'true' ? '1' : '0'}`;
      });
      
      // Convert PostgreSQL LIMIT/OFFSET to T-SQL OFFSET...FETCH or TOP
      // Handle LIMIT with OFFSET (pagination): LIMIT @param2 OFFSET @param3
      if (queryText.match(/\bLIMIT\s+@param\d+\s+OFFSET\s+@param\d+/i)) {
        queryText = queryText.replace(/\bLIMIT\s+(@param\d+)\s+OFFSET\s+(@param\d+)/i, 
          'OFFSET $2 ROWS FETCH NEXT $1 ROWS ONLY');
      } 
      // Handle simple LIMIT: LIMIT 1 or LIMIT @param1
      else {
        const limitMatch = queryText.match(/\bLIMIT\s+(\d+|@param\d+)/i);
        if (limitMatch) {
          const limitValue = limitMatch[1];
          queryText = queryText.replace(/\bSELECT\b/i, `SELECT TOP ${limitValue}`);
          queryText = queryText.replace(/\bLIMIT\s+(\d+|@param\d+)/gi, '');
        }
      }
      
      const result = await request.query(queryText);
      return {
        rows: result.recordset || [],
        rowCount: result.rowsAffected[0] || 0
      };
    },
    commit: async () => await transaction.commit(),
    rollback: async () => await transaction.rollback(),
    release: () => {}
  };
};

const pool = { query, connect };
module.exports = pool;
