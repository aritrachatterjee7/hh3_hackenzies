"use client";
import { useState, useEffect } from 'react';
import { ArrowRight, Earth, Recycle, Coins, MapPin, Award, AlertTriangle, Users, Leaf, BarChart2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Poppins } from 'next/font/google';
import Link from 'next/link';
import { getRecentReports, getAllRewards, getWasteCollectionTasks } from '@/utils/db/actions';
import { motion, AnimatePresence } from 'framer-motion';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import Image from 'next/image';

ChartJS.register(ArcElement, Tooltip, Legend);

const poppins = Poppins({
  weight: ['300', '400', '600'],
  subsets: ['latin'],
  display: 'swap',
});

interface StatisticBadgeProps {
  value: string | number;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}

function StatisticBadge({ value, label, icon: Icon, color = 'green' }: StatisticBadgeProps) {
  const colors = {
    green: {
      bg: 'bg-green-50/50',
      text: 'text-green-500',
      darkText: 'text-green-800',
      ring: 'ring-green-200',
    },
    red: {
      bg: 'bg-red-50/50',
      text: 'text-red-500',
      darkText: 'text-red-800',
      ring: 'ring-red-200',
    },
    blue: {
      bg: 'bg-blue-50/50',
      text: 'text-blue-500',
      darkText: 'text-blue-800',
      ring: 'ring-blue-200',
    },
    purple: {
      bg: 'bg-purple-50/50',
      text: 'text-purple-500',
      darkText: 'text-purple-800',
      ring: 'ring-purple-200',
    },
  };
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`flex items-center gap-3 ${colors[color as keyof typeof colors].bg} px-4 py-3 rounded-xl backdrop-blur-sm ring-1 ${colors[color as keyof typeof colors].ring}`}
    >
      <Icon className={`h-5 w-5 ${colors[color as keyof typeof colors].text}`} />
      <div>
        <span className={`font-bold ${colors[color as keyof typeof colors].darkText}`}>{value}</span>
        <span className={`ml-2 ${colors[color as keyof typeof colors].text} text-sm`}>{label}</span>
      </div>
    </motion.div>
  );
}

const useAnimatedCounter = (target: number, duration: number = 2000) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const step = target / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        clearInterval(timer);
        setCount(target);
      } else {
        setCount(Math.floor(current));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
};

function AdOverlay({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] overflow-hidden flex"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 bg-white/90 hover:bg-white rounded-full p-2 transition-all shadow-md"
        >
          <X className="h-6 w-6 text-gray-700" />
        </button>

        {/* Left Side: Image Container */}
        <div className="w-1/2 bg-gray-100 flex items-center justify-center p-4">
          <div className="relative w-full h-full">
            <Image
              src="/laptop.jpg"
              alt="Laptop and Mobile Offer"
              fill
              className="object-contain"
            />
          </div>
        </div>

        {/* Right Side: Animated Content */}
        <div className="w-1/2 py-8 px-6 flex flex-col justify-center bg-gradient-to-br from-blue-50 to-purple-50">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-6"
          >
            <h2 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-600">
              💥 EXCLUSIVE OFFERS
            </h2>
            <p className="text-xl font-semibold text-gray-600">on Laptops, Mobiles and other accessories</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mb-6"
          >
            <h3 className="text-xl font-bold text-gray-800 mb-3 flex items-center justify-center">
              <Award className="mr-2 text-yellow-500" /> Why Choose Us?
            </h3>
            <ul className="space-y-2">
              {[
                { icon: <Coins className="text-green-500" />, text: "Exclusive discounts on premium brands" },
                { icon: <Recycle className="text-blue-500" />, text: "Eco-friendly recycling with every purchase" },
                { icon: <Leaf className="text-green-500" />, text: "100% genuine products with warranty" },
                { icon: <BarChart2 className="text-purple-500" />, text: "Fast & free delivery across India" },
                { icon: <Users className="text-orange-500" />, text: "24/7 customer support" },
              ].map((item, index) => (
                <motion.li
                  key={index}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex items-center text-gray-700 px-4"
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.text}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center mb-6"
          >
            <p className="text-lg font-medium text-gray-800 mb-2">🌍 Be Smart. Save Money. Save the Planet.</p>
            <p className="text-gray-600">Upgrade responsibly and help reduce e-waste.</p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/report" className="w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all"
              >
                Recycle Your Waste Now & Save
              </motion.button>
            </Link>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all"
            >
              Learn More
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface WasteTask {
  amount?: string;
  hazardous?: boolean;
}

interface Reward {
  points?: number;
}

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [showAd, setShowAd] = useState(true);
  const [impactData, setImpactData] = useState({
    wasteCollected: 0,
    reportsSubmitted: 0,
    tokensEarned: 0,
    co2Offset: 0,
    hazardousWaste: 0,
  });

  useEffect(() => {
    async function fetchImpactData() {
      try {
        const reports = await getRecentReports(100);
        const rewards = await getAllRewards();
        const tasks = await getWasteCollectionTasks(100);
        const wasteCollected = tasks.reduce((total: number, task: WasteTask) => {
          const match = task.amount?.match(/(\d+(\.\d+)?)/);
          const amount = match ? parseFloat(match[0]) : 0;
          return total + amount;
        }, 0);
        const hazardousWaste = tasks
          .filter((task: WasteTask) => task.hazardous)
          .reduce((total: number, task: WasteTask) => {
            const match = task.amount?.match(/(\d+(\.\d+)?)/);
            return total + (match ? parseFloat(match[0]) : 0);
          }, 0);
        const reportsSubmitted = reports.length;
        const tokensEarned = rewards.reduce((total: number, reward: Reward) => total + (reward.points || 0), 0);
        const co2Offset = wasteCollected * 2.3;
        setImpactData({
          wasteCollected: Math.round(wasteCollected * 10) / 10,
          reportsSubmitted,
          tokensEarned,
          co2Offset: Math.round(co2Offset * 10) / 10,
          hazardousWaste: Math.round(hazardousWaste * 10) / 10,
        });
      } catch (error) {
        console.error("Error fetching impact data:", error);
      }
    }
    fetchImpactData();
  }, []);

  const animatedWaste = useAnimatedCounter(impactData.wasteCollected);
  const animatedCO2 = useAnimatedCounter(impactData.co2Offset);
  const animatedTokens = useAnimatedCounter(impactData.tokensEarned);
  const animatedHazardous = useAnimatedCounter(impactData.hazardousWaste);

  return (
    <div className={`min-h-screen bg-gradient-to-br from-white via-green-50 to-emerald-100 ${poppins.className}`}>
      <AnimatePresence>
        {showAd && <AdOverlay onClose={() => setShowAd(false)} />}
      </AnimatePresence>
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center text-center py-12"
        >
          {/* Revolving Earth Icon */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="relative mb-6"
          >
            <div className="aspect-square w-40 mx-auto relative">
              <div className="absolute inset-0 bg-gradient-to-br from-green-200 to-emerald-300 rounded-full animate-pulse opacity-30 blur-md"></div>
              <div className="absolute inset-6 bg-gradient-to-br from-green-300 to-emerald-400 rounded-full animate-ping opacity-40 blur-sm"></div>
              <div className="absolute inset-0 m-auto h-28 w-28 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-2xl shadow-emerald-300/50 flex items-center justify-center">
                <Earth className="h-20 w-20 text-white" />
              </div>
            </div>
          </motion.div>
          <h1 className="text-5xl font-bold text-gray-800 leading-tight mb-4">
            Transform Waste into{" "}
            <motion.span
              initial={{ color: "#10B981" }}
              animate={{ color: ["#10B981", "#059669", "#10B981"] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="block mt-2 bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-emerald-600"
            >
              Environmental Impact
            </motion.span>
          </h1>
          <p className="text-gray-600 max-w-2xl mb-8">
            Join the movement to reduce e-waste, earn rewards, and make a positive impact on the planet.
          </p>
          <div className="flex flex-wrap gap-4 justify-center mb-10">
            <StatisticBadge value={`${animatedWaste}kg`} label="E-Waste Collected" icon={Recycle} color="green" />
            <StatisticBadge value={animatedTokens} label="Tokens Earned" icon={Coins} color="purple" />
            <StatisticBadge value={`${animatedCO2}kg`} label="CO2 Offset" icon={Leaf} color="green" />
            <StatisticBadge value={`${animatedHazardous}kg`} label="Hazardous Waste" icon={AlertTriangle} color="red" />
          </div>
          {!loggedIn ? (
            <Button
              onClick={() => setLoggedIn(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-12 py-6 rounded-full text-xl transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Join the Movement
              <ArrowRight className="ml-2" />
            </Button>
          ) : (
            <Link href="/report">
              <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-12 py-6 rounded-full text-xl transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg hover:shadow-xl">
                Start Reporting
                <ArrowRight className="ml-2" />
              </Button>
            </Link>
          )}
        </motion.div>

        {/* How It Works Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="py-16"
        >
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: MapPin,
                title: "Report E-Waste",
                description: "Scan QR codes or upload photos of electronic waste using our AI classifier.",
                color: "green",
              },
              {
                icon: Recycle,
                title: "Track Collection",
                description: "Real-time tracking of waste collection with environmental impact metrics.",
                color: "blue",
              },
              {
                icon: Award,
                title: "Earn & Compete",
                description: "Redeem rewards and climb the leaderboard for top recyclers.",
                color: "purple",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 + index * 0.2 }}
                whileHover={{ y: -5 }}
                className={`bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border-l-4 border-${feature.color}-500`}
              >
                <div className="flex items-center gap-4">
                  <div className={`bg-${feature.color}-100 w-12 h-12 rounded-full flex items-center justify-center`}>
                    <feature.icon className={`h-6 w-6 text-${feature.color}-600`} />
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                </div>
                <p className="text-gray-600 mt-4">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Community Impact Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.6 }}
          className="bg-white rounded-3xl p-8 shadow-lg mb-20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Community Impact</h2>
            <p className="text-gray-600">Together we&apos;re building a sustainable future</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex flex-wrap justify-around gap-4 mb-8">
                {[
                  { value: animatedWaste, label: "KG E-Waste Collected", icon: Recycle, color: "green" },
                  { value: impactData.reportsSubmitted, label: "Reports Submitted", icon: BarChart2, color: "blue" },
                  { value: animatedTokens, label: "Tokens Earned", icon: Coins, color: "purple" },
                  { value: animatedCO2, label: "KG CO2 Offset", icon: Leaf, color: "green" },
                ].map((stat, index) => (
                  <div key={index} className="text-center p-4">
                    <div className="flex justify-center mb-2">
                      <stat.icon className={`h-6 w-6 text-${stat.color}-500`} />
                    </div>
                    <div className="text-4xl font-bold text-gray-800 mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-center mb-4">Waste Composition</h3>
              <div className="h-64">
                <Doughnut
                  data={{
                    labels: ["Recyclable", "Hazardous", "Refurbishable"],
                    datasets: [
                      {
                        data: [
                          impactData.wasteCollected - impactData.hazardousWaste,
                          impactData.hazardousWaste,
                          impactData.wasteCollected * 0.2,
                        ],
                        backgroundColor: ["#10B981", "#EF4444", "#3B82F6"],
                        borderWidth: 0,
                      },
                    ],
                  }}
                  options={{
                    cutout: "70%",
                    plugins: {
                      legend: {
                        position: "bottom",
                        labels: {
                          boxWidth: 12,
                          padding: 20,
                          usePointStyle: true,
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}