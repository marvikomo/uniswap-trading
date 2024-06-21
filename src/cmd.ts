import dotenv from 'dotenv'
dotenv.config()

import * as readline from 'readline'
import { getRoute, swap } from './swap'
import { resolveTokenAddressFromSymbol } from './util/token'
import {
  wrapETH,
  unwrapETH,
  getTokenBalance,
  getWalletBalance,
  TransactionState,
} from './provider'
import { SwapRoute } from '@uniswap/smart-order-router'
import { Token } from '@uniswap/sdk-core'

interface TokenSwapDetails {
  tokenASymbol: string
  tokenBSymbol: string
  amount: number
  route: SwapRoute // Expected amount of Token B
  tokenA: Token
  tokenB: Token
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer)
    })
  })
}

const getTokenSwapDetails = async (): Promise<TokenSwapDetails> => {
  const tokenASymbol: string = await question('Enter Token A symbol: ')
  const tokenBSymbol: string = await question('Enter Token B symbol: ')
  const amountInput = await question('Enter the amount of Token A to swap: ')
  const amount = parseFloat(amountInput)

  const tokenA: Token = resolveTokenAddressFromSymbol(tokenASymbol)
  const tokenB: Token = resolveTokenAddressFromSymbol(tokenBSymbol)

  if (isNaN(amount)) {
    console.error('Invalid number for amount.')
    process.exit(1)
  }

  const route = await getRoute(tokenA, tokenB, amount)

  const expectedAmount = route.quote.toExact()

  console.log('Exp', expectedAmount)

  return {
    tokenASymbol,
    tokenBSymbol,
    amount,
    route,
    tokenA,
    tokenB,
  }
}

const main = async () => {
  try {
    const swapDetails = await getTokenSwapDetails()
    console.log(
      `You want to swap ${swapDetails.amount} ${
        swapDetails.tokenASymbol
      } for an expected ${swapDetails.route.quote.toExact()} ${
        swapDetails.tokenBSymbol
      }`,
    )

    const confirmation = await question(
      'Do you want to proceed with this swap? (yes/no): ',
    )
    if (confirmation.toLowerCase() !== 'yes') {
      console.log('Swap cancelled by the user.')
      return
    }

    console.log('Proceeding with the swap...')
    if (swapDetails.tokenASymbol === 'ETH') {
      console.log('wrapping...')
      await wrapETH(swapDetails.amount.toString());
    }

    const tokenABalanceBefore = await getTokenBalance(
      swapDetails.tokenA.address,
    )

    console.log('Token A Balance before transaction is ', tokenABalanceBefore)

    const tokenBBalanceBefore = await getTokenBalance(
      swapDetails.tokenB.address,
    )

    console.log('Token B Balance before transaction is ', tokenBBalanceBefore)

    console.log(
      'Wallet address balance after transaction: ',
      (await getWalletBalance()).toString(),
    )

    let transactionResponse = await swap(swapDetails.route, swapDetails.tokenA)

    if (transactionResponse === TransactionState.Sent) {
      if (swapDetails.tokenBSymbol === 'ETH') {
        console.log('unwraping')
        let tx = await unwrapETH(swapDetails.route.quote.toExact())
        console.log(tx)
      }
    }

    const tokenABalanceAfter = await getTokenBalance(swapDetails.tokenA.address)

    console.log('Token A balance after transaction is ', tokenABalanceAfter)

    const tokenBBalanceAfter = await getTokenBalance(swapDetails.tokenB.address)
    console.log('Token B Balance after transaction is ', tokenBBalanceAfter)

    console.log(
      'Wallet address balance after transaction: ',
      (await getWalletBalance()).toString(),
    )
  } catch (error) {
    console.error('Error:', error)
  } finally {
    rl.close()
  }
}

main()
