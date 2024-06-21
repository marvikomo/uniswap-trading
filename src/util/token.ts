import { ChainId, Token } from '@uniswap/sdk-core'

// Map of token symbols to their configuration for creating Token instances.
const tokenConfig = {
  USDC: {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    decimals: 6,
    symbol: 'USDC',
    name: 'USD//C'
  },
  ETH: {
    address: '0x4200000000000000000000000000000000000006',
    decimals: 18,
    symbol: 'WETH', // Assuming ETH is wrapped as WETH
    name: 'Wrapped Ether'
  }
}

/**
 * Creates a new token instance using the provided configuration.
 * @param {string} symbol - The token symbol.
 * @returns {Token} The Token instance.
 */
function createToken(symbol) {
  const config = tokenConfig[symbol];
  if (!config) {
    throw new Error('Token symbol not recognized.');
  }
  return new Token(
    ChainId.BASE,
    config.address,
    config.decimals,
    config.symbol,
    config.name
  );
}

/**
 * Checks if a token address is supported in the system.
 * @param {string} tokenAddress - The blockchain address of the token to check.
 * @throws {Error} Throws an error if the token address is not supported.
 */
export function checkTokenSupport(tokenAddress: string) {
  const isSupported = Object.values(tokenConfig).some(token => token.address === tokenAddress);
  if (!isSupported) {
    throw new Error('Token is not supported.');
  }
}

/**
 * Resolves a token symbol to its corresponding Token instance.
 * @param {string} symbol - The symbol of the token to resolve.
 * @returns {Token} The Token instance associated with the given token symbol.
 */
export function resolveTokenAddressFromSymbol(symbol: string): Token {
  return createToken(symbol);
}

// Export predefined token instances for common tokens.
export const USDC_TOKEN = createToken('USDC');
export const WETH_TOKEN = createToken('ETH');