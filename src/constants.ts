// Addresses

export const V3_SWAP_ROUTER_ADDRESS =
  '0x2626664c2603336E57B271c5C0b26F421741e481'
export const WETH_CONTRACT_ADDRESS =
  '0x4200000000000000000000000000000000000006'

export const POOL_FACTORY_CONTRACT_ADDRESS =
  '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'


// ABI's

export const ERC20_ABI = [
  // Read-Only Functions
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function allowance(address owner, address spender) view returns (uint256)',
  // Authenticated Functions
  'function transfer(address to, uint amount) returns (bool)',
  'function approve(address _spender, uint256 _value) returns (bool)',

  // Events
  'event Transfer(address indexed from, address indexed to, uint amount)',
]

export const WETH_ABI = [
  // Wrap ETH
  'function deposit() payable',

  // Unwrap ETH
  'function withdraw(uint wad) public',
]

// Transactions
export const MAX_FEE_PER_GAS = 30000000
export const MAX_PRIORITY_FEE_PER_GAS = 30000000
export const TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER = 10000
