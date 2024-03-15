import { dryrun } from "@permaweb/aoconnect/browser"

import { nativeTokenInfo } from "@/utils/native-token"
import { wait } from "@/utils/utils"

export type TokenInfo = {
  processId: string
  denomination: number
  ticker: string
  logo: string
  name: string
}

export type TokenHolder = {
  rank: number
  entityId: string
  balance: number
}

export async function getBalance(tokenId: string, entityId: string) {
  const result = await dryrun({
    process: tokenId,
    data: "",
    tags: [
      { name: "Action", value: "Balance" },
      { name: "Target", value: entityId },
    ],
  })

  try {
    const message = result.Messages[0]
    const balance =
      message.Data ||
      message.Tags?.find((tag: any) => tag.name === "Balance")?.value
    const balanceNumber = parseFloat(balance)
    return balanceNumber
  } catch (err) {
    console.error(err)
  }

  return null
}

type BalanceMap = {
  [key: string]: string | number
}

export async function getTokenHolders(
  tokenInfo: TokenInfo,
): Promise<TokenHolder[]> {
  const result = await dryrun({
    process: tokenInfo.processId,
    data: "",
    tags: [{ name: "Action", value: "Balances" }],
  })

  try {
    const balanceMap = JSON.parse(result.Messages[0].Data) as BalanceMap
    const tokenHolders = Object.keys(balanceMap)
      .filter(
        (entityId) =>
          balanceMap[entityId] !== "0" && balanceMap[entityId] !== 0,
      )
      .sort((a, b) => Number(balanceMap[b]) - Number(balanceMap[a]))
      .map((entityId, index) => ({
        rank: index + 1,
        entityId,
        balance: Number(balanceMap[entityId]) / 10 ** tokenInfo.denomination,
      }))

    return tokenHolders
  } catch (err) {
    console.error(err)
  }

  return []
}

type Tag = {
  name: string
  value: string
}

export async function getTokenInfo(
  processId: string,
): Promise<TokenInfo | undefined> {
  const result = await dryrun({
    process: processId,
    data: "",
    tags: [{ name: "Action", value: "Info" }],
  })

  try {
    const tags = result.Messages[0].Tags as Tag[]
    const tagMap = tags.reduce(
      (acc, tag) => {
        acc[tag.name] = tag.value
        return acc
      },
      {} as { [key: string]: string },
    )

    return {
      processId,
      denomination: parseInt(tagMap["Denomination"]),
      ticker: tagMap["Ticker"],
      logo: tagMap["Logo"],
      name: tagMap["Name"],
    }
  } catch (err) {
    console.error(err)
  }
}

export type TokenInfoMap = Record<string, TokenInfo>

export async function getTokenInfoMap(
  processIds: string[],
): Promise<TokenInfoMap> {
  const map: TokenInfoMap = {}

  const results = await Promise.all(
    processIds.map((processId) =>
      processId === nativeTokenInfo.processId
        ? nativeTokenInfo
        : Promise.race([getTokenInfo(processId), wait(5_000)]),
    ),
  )

  for (const info of results) {
    if (info) {
      map[info.processId] = info
    }
  }

  return map
}

export type TokenBalanceMap = Record<string, number | null>

export async function getTokenBalanceMap(
  tokenIds: string[],
  entityId: string,
): Promise<TokenBalanceMap> {
  const map: TokenBalanceMap = {}

  const results = await Promise.all(
    tokenIds.map((tokenId) =>
      Promise.race([getBalance(tokenId, entityId), wait(5_000)]),
    ),
  )

  results.forEach((balance, index) => {
    map[tokenIds[index]] = balance
  })

  return map
}
