import { ethers, BigNumber }  from "ethers"

import {WETH_ABI, ERC20_ABI, WETH_CONTRACT_ADDRESS, MAX_FEE_PER_GAS, MAX_PRIORITY_FEE_PER_GAS } from './constants'

import { Config } from "./config"




export enum TransactionState {
    Failed = 'Failed',
    New = 'New',
    Rejected = 'Rejected',
    Sending = 'Sending',
    Sent = 'Sent',
  }

  
const provider = new ethers.providers.JsonRpcProvider(Config.rpc.mainnet)

const wallet = createWallet()

 function createWallet(): ethers.Wallet {
    const PRIVATE_KEY = Config.wallet.privateKey

    if(!PRIVATE_KEY) {
        throw new Error("Private key is required!")
    }

   return  new ethers.Wallet(PRIVATE_KEY, provider);
}

export function getWalletAddress(): string {
  return wallet.address;
}

export function getProvider() {
    return wallet.provider;
}

export async function getWalletBalance(): Promise<BigNumber>{
    return await wallet.getBalance()
}


export function getContract(tokenAddress: string, abi: string[]): ethers.Contract {
  return new ethers.Contract(
    tokenAddress,
    abi,
    provider,
  )
}


export async function sendTransaction(
    transaction: ethers.providers.TransactionRequest
  ): Promise<TransactionState> {
    
    const provider = getProvider()
  if (!provider) {
    return TransactionState.Failed
  }

  if (transaction.value) {
    transaction.value = BigNumber.from(transaction.value)
  }

  const txRes = await wallet.sendTransaction(transaction)
  let receipt = null

  while (receipt === null) {
    try {
      receipt = await provider.getTransactionReceipt(txRes.hash)

      if (receipt === null) {
        continue
      }
    } catch (e) {
      console.log(`Receipt error:`, e)
      break
    }
  }

  if (receipt) {
   if(receipt.status === 0) {
    return TransactionState.Failed
   }
    return TransactionState.Sent
  } else {
    return TransactionState.Failed
  }

  }


// wraps ETH 
export async function wrapETH(eth: string) {
  const provider = getProvider()
  const address = getWalletAddress()
  if (!provider || !address) {
    throw new Error('Cannot wrap ETH without a provider and wallet address')
  }

  const val = ethers.utils.parseEther(eth)
   console.log("Value", val.toString())

  const wethContract = new ethers.Contract(
    WETH_CONTRACT_ADDRESS,
    WETH_ABI,
    provider
  )

  console.log(`Wrapping ${eth} ETH...`);
  const depositTx = await wethContract.connect(wallet).deposit({
    value: ethers.utils.parseEther(eth),
  });

  await depositTx.wait();
}

// unwraps WETH 
export async function unwrapETH(eth: string) {

  const provider = getProvider()
  const address = getWalletAddress()
  if (!provider || !address) {
    throw new Error('Cannot unwrap ETH without a provider and wallet address')
  }

  const wethContract = new ethers.Contract(
    WETH_CONTRACT_ADDRESS,
    WETH_ABI,
    provider
  )

  console.log(`Unwrapping ${eth} ETH...`);
  const withdrawTx = await wethContract.connect(wallet).withdraw(ethers.utils.parseEther(eth));

  return await withdrawTx.wait();
}



export async function getTokenBalance(tokenAddress) {
  // Attempt to obtain references to the blockchain provider and user's wallet address.
  const provider = getProvider()
  if (!provider) {
    throw new Error('Blockchain provider is not available.')
  }

  const address = getWalletAddress()
  if (!address) {
    throw new Error('Wallet address is not available.')
  }

  try {
    // Initialize a contract instance for the ERC20 token using its address and the provider.
    const tokenContract: ethers.Contract = getContract(tokenAddress, ERC20_ABI)

    // Query the balance of the token for the user's address.
    const balance = await tokenContract.balanceOf(address)

    // Convert the balance from wei (or the smallest token unit) to Ether (or a more readable unit).
    return ethers.utils.formatEther(balance)
  } catch (error) {
    console.error('Failed to retrieve token balance:', error)
    return '0.0' // Returning a balance of zero in case of any errors.
  }
}
