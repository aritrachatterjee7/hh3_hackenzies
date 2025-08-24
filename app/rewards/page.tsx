'use client'
import { useState, useEffect } from 'react'
import { Coins, ArrowUpRight, ArrowDownRight, Gift, AlertCircle, Loader, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'react-hot-toast'
import {
  getUserByEmail,
  getRewardTransactions,
  getAvailableRewards,
  redeemReward,
  createTransaction
} from '@/utils/db/actions'

type Transaction = {
  id: number
  type: 'earned_report' | 'earned_collect' | 'redeemed'
  amount: number
  description: string
  date: string
}

type Reward = {
  id: number
  name: string
  cost: number
  description: string | null
  collectionInfo: string
}

export default function RewardsPage() {
  const [user, setUser] = useState<{ id: number; email: string; name: string } | null>(null)
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch user data, transactions, and rewards
  useEffect(() => {
    const fetchUserDataAndRewards = async () => {
      setLoading(true)
      try {
        const userEmail = localStorage.getItem('userEmail')
        if (!userEmail) {
          toast.error('Please log in to view rewards.')
          return
        }

        const fetchedUser = await getUserByEmail(userEmail)
        if (!fetchedUser) {
          toast.error('User not found. Please log in again.')
          return
        }

        setUser(fetchedUser)
        const [fetchedTransactions, fetchedRewards] = await Promise.all([
          getRewardTransactions(fetchedUser.id),
          getAvailableRewards(fetchedUser.id)
        ])

        setTransactions(fetchedTransactions as Transaction[])
        setRewards(fetchedRewards.filter(r => r.cost > 0)) // Filter out zero-cost rewards

        // Calculate balance
        const calculatedBalance = fetchedTransactions.reduce((acc, transaction) =>
          transaction.type.startsWith('earned') ? acc + transaction.amount : acc - transaction.amount, 0)
        setBalance(Math.max(calculatedBalance, 0))

      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load rewards. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchUserDataAndRewards()
  }, [])

  // Refresh user data after redemption
  const refreshUserData = async () => {
    if (!user) return

    try {
      const [fetchedTransactions, fetchedRewards] = await Promise.all([
        getRewardTransactions(user.id),
        getAvailableRewards(user.id)
      ])

      setTransactions(fetchedTransactions as Transaction[])
      setRewards(fetchedRewards.filter(r => r.cost > 0))

      const calculatedBalance = fetchedTransactions.reduce((acc, transaction) =>
        transaction.type.startsWith('earned') ? acc + transaction.amount : acc - transaction.amount, 0)
      setBalance(Math.max(calculatedBalance, 0))

    } catch (error) {
      console.error('Error refreshing data:', error)
      toast.error('Failed to refresh rewards. Please try again.')
    }
  }

  // Redeem a specific reward
  const handleRedeemReward = async (reward: Reward) => {
    if (!user) {
      toast.error('Please log in to redeem rewards.')
      return
    }

    if (balance < reward.cost) {
      toast.error('Insufficient points for this reward.')
      return
    }

    try {
      await redeemReward(user.id, reward.id)
      await createTransaction(user.id, 'redeemed', reward.cost, `Redeemed: ${reward.name}`)
      await refreshUserData()
      toast.success(`Successfully redeemed: ${reward.name}!`)
    } catch (error) {
      console.error('Redemption error:', error)
      toast.error('Failed to redeem reward. Please try again.')
    }
  }

  // Redeem all points (e.g., for cashback or voucher)
  const handleRedeemAllPoints = async () => {
    if (!user) {
      toast.error('Please log in to redeem points.')
      return
    }

    if (balance <= 0) {
      toast.error('No points available to redeem.')
      return
    }

    try {
      await redeemReward(user.id, 0) // Special ID for "redeem all"
      await createTransaction(user.id, 'redeemed', balance, 'Redeemed all points for cashback')
      await refreshUserData()
      toast.success(`Successfully redeemed ${balance} points!`)
      // Redirect to a partner site (e.g., voucher page)
      window.open('https://prize-lake.vercel.app/', '_blank')
    } catch (error) {
      console.error('Redemption error:', error)
      toast.error('Failed to redeem points. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="animate-spin h-8 w-8 text-gray-600" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Your Rewards</h1>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border border-green-200 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 mb-1">Available Points</p>
            <p className="text-3xl font-bold text-green-700">{balance}</p>
          </div>
          <Coins className="h-12 w-12 text-green-600" />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Recent Transactions */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
            <ArrowUpRight className="h-5 w-5 text-green-500 mr-2" />
            Recent Transactions
          </h2>

          {transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.slice(0, 5).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex justify-between items-center p-3 rounded-lg bg-gray-50"
                >
                  <div className="flex items-center">
                    {transaction.type.startsWith('earned') ? (
                      <ArrowUpRight className="h-5 w-5 text-green-500 mr-3" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5 text-red-500 mr-3" />
                    )}
                    <div>
                      <p className="font-medium text-gray-800">{transaction.description}</p>
                      <p className="text-xs text-gray-500">{transaction.date}</p>
                    </div>
                  </div>
                  <span className={`font-medium ${transaction.type.startsWith('earned') ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.type.startsWith('earned') ? '+' : '-'}
                    {transaction.amount} pts
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p>No transactions yet</p>
            </div>
          )}
        </div>

        {/* Available Rewards */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
            <Gift className="h-5 w-5 text-purple-500 mr-2" />
            Available Rewards
          </h2>

          {rewards.length > 0 ? (
            <div className="space-y-4">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className="p-4 rounded-lg border border-gray-100 bg-gray-50"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium text-gray-800">{reward.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{reward.description}</p>
                    </div>
                    <span className="text-purple-600 font-medium">
                      {reward.cost} pts
                    </span>
                  </div>
                  <Button
                    onClick={() => handleRedeemReward(reward)}
                    disabled={balance < reward.cost}
                    className={`w-full ${balance >= reward.cost ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-300 cursor-not-allowed'}`}
                  >
                    {balance >= reward.cost ? 'Redeem Now' : 'Not Enough Points'}
                  </Button>
                </div>
              ))}

              {/* Redeem All Points Button */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <Button
                  onClick={handleRedeemAllPoints}
                  disabled={balance <= 0}
                  className={`w-full ${balance > 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'}`}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {balance > 0 ? `Redeem All (${balance} pts)` : 'No Points to Redeem'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p>No rewards available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
