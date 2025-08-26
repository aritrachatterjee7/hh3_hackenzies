'use client'
import { useState, useEffect } from 'react'
import { Upload, Loader, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { QRCodeSVG } from 'qrcode.react'
import {
  createUser,
  getUserByEmail,
  createReport,
  getRecentReports,
} from '@/utils/db/actions'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import Image from 'next/image'

interface User {
  id: number
  email: string
  name: string
}

interface VerificationResultData {
  wasteType: string
  quantity: string
  confidence: number
  hazardous?: boolean
  disposalInstructions?: string
  recyclingValue?: string
  classification?: string
}

interface Report {
  id: number
  userId: number
  location: string
  wasteType: string
  amount: string
  imageUrl: string | null
  verificationResult: VerificationResultData | null
  status: 'pending' | 'in_progress' | 'completed'
  createdAt: Date | string
  assignedAt: Date | string | null
  completedAt: Date | string | null
  collectorId: number | null
  updatedAt: Date | string
  hazardous?: boolean
}

interface VerificationResult {
  wasteType: string
  quantity: string
  confidence: number
  hazardous?: boolean
  disposalInstructions?: string
  recyclingValue?: string
  classification?: string
}

interface NewReport {
  location: string
  type: string
  amount: string
}

interface Voucher {
  id: string
  code: string
  amount: number
  deviceType: string
  redeemed: boolean
  createdAt: string
}

const DEVICE_VOUCHER_AMOUNTS: Record<string, number> = {
  mobile: 1000,
  'mobile phone': 1000,
  smartphone: 1000,
  laptop: 5000,
  tablet: 2000,
  desktop: 6000,
  monitor: 3000,
  notebook: 4000,
  ultrabook: 4000,
  computer: 5000,
}

const formatDate = (date: Date | string | null): string => {
  if (!date) return ''
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toISOString().split('T')[0]
}

export default function ReportPage() {
  const [user, setUser] = useState<User | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [newReport, setNewReport] = useState<NewReport>({
    location: '',
    type: '',
    amount: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'failure' | 'no_waste'>('idle')
  const [verificationResult, setVerificationResult] = useState<VerificationResultData | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [qrValue, setQrValue] = useState<string>('')
  const [viewingQrReport, setViewingQrReport] = useState<Report | null>(null)
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [showVoucherModal, setShowVoucherModal] = useState(false)
  const [currentVoucher, setCurrentVoucher] = useState<Voucher | null>(null)
  const router = useRouter()
  const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('eWasteVouchers')
      setVouchers(saved ? JSON.parse(saved) : [])
    }
  }, [])

  const generateQrContent = (report: Report) => {
    const currentReport = reports.find(r => r.id === report.id) || report
    return `
E-WASTE REPORT #${currentReport.id}
--------------------------
📍 Location: ${currentReport.location}
♻️ Type: ${currentReport.wasteType}
⚖️ Amount: ${currentReport.amount}
🔄 Status: ${currentReport.status}
📅 Reported: ${formatDate(currentReport.createdAt)}
${currentReport.hazardous ? '⚠️ HAZARDOUS: Handle with care' : ''}
${currentReport.verificationResult?.disposalInstructions ? `♻️ Disposal: ${currentReport.verificationResult.disposalInstructions}` : ''}
`.trim()
  }

  const generateVoucherCode = (deviceType: string, amount: number): string => {
    const prefix = deviceType.toUpperCase().slice(0, 3)
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `${prefix}${amount}OFF${randomSuffix}`
  }

  const addVoucher = (deviceType: string, amount: number) => {
    const newVoucher: Voucher = {
      id: Date.now().toString(),
      code: generateVoucherCode(deviceType, amount),
      amount,
      deviceType,
      redeemed: false,
      createdAt: new Date().toISOString(),
    }
    const updatedVouchers = [...vouchers, newVoucher]
    setVouchers(updatedVouchers)
    localStorage.setItem('eWasteVouchers', JSON.stringify(updatedVouchers))
    setCurrentVoucher(newVoucher)
    setShowVoucherModal(true)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Voucher code copied to clipboard!')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewReport({ ...newReport, [name]: value })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      const reader = new FileReader()
      reader.onload = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const extractJsonFromText = (text: string): string => {
    const startIndex = text.indexOf('{')
    const endIndex = text.lastIndexOf('}')
    if (startIndex === -1 || endIndex === -1) {
      throw new Error('No valid JSON object found in response')
    }
    return text.substring(startIndex, endIndex + 1)
  }

  const handleVerify = async () => {
    if (!file) return
    setVerificationStatus('verifying')
    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const base64Data = await readFileAsBase64(file)
      const imageParts = [{ inlineData: { data: base64Data.split(',')[1], mimeType: file.type } }]
      const E_WASTE_CATEGORIES = [
        'batteries', 'lithium-ion batteries', 'lead-acid batteries', 'computers',
        'laptops', 'monitors', 'keyboards', 'mice', 'printers', 'scanners',
        'mobile phones', 'tablets', 'cables', 'circuit boards', 'hard drives',
        'servers', 'routers', 'switches', 'UPS systems', 'projectors', 'scanners',
        'copiers', 'faxes', 'televisions', 'DVD players', 'game consoles', 'speakers',
        'headphones', 'chargers', 'power supplies', 'electronic components',
        'motherboards', 'RAM modules', 'graphic cards', 'sound cards', 'network cards',
        'cables', 'wires', 'power adapters', 'ink cartridges', 'toner cartridges'
      ]
      const WASTE_CLASSIFICATIONS = [
        'recyclable', 'hazardous', 'refurbishable', 'non-recyclable'
      ]
      const prompt = `
You are an expert in E-WASTE management and electronic waste recycling with 15 years of experience. Analyze this image specifically for ELECTRONIC WASTE items ONLY.
Respond ONLY in this JSON format:
{
  "wasteType": "specific_e_waste_type_from_list",
  "quantity": "estimated_quantity_with_unit(kg/units)",
  "confidence": number_between_0_and_100,
  "hazardous": boolean,
  "classification": "waste_classification_type",
  "disposalInstructions": "brief_handling_instructions",
  "recyclingValue": "estimated_recycling_value_in_tokens"
}
Important Rules:
1. ONLY consider items from this e-waste list: ${E_WASTE_CATEGORIES.join(', ')}
2. Classify waste into one of these categories: ${WASTE_CLASSIFICATIONS.join(', ')}
   - recyclable: Materials that can be processed to make new products
   - hazardous: Items containing toxic materials (batteries, CRTs, circuit boards)
   - refurbishable: Devices that can be repaired and reused
   - non-recyclable: Items that cannot be recycled with current technology
3. If the item is NOT electronic waste, return: {"wasteType":"none","quantity":"0","confidence":100,"hazardous":false,"classification":"non-recyclable","disposalInstructions":"Not e-waste","recyclingValue":"0"}
4. For hazardous materials (batteries, circuit boards, CRTs, etc.), set "hazardous": true
5. Provide brief disposal instructions based on the waste type, hazard level, and classification
6. Quantity should be estimated in kg for bulk items or "units" for individual items
7. Estimate recycling value in tokens based on:
   - Common items (cables, keyboards): 5-15 tokens
   - Medium-value items (phones, tablets): 20-50 tokens
   - High-value items (laptops, monitors): 60-100 tokens
   - Hazardous materials: +10 tokens bonus for proper disposal
   - Refurbishable items: +15 tokens bonus for potential reuse
8. If multiple items are present, identify the most prominent/hazardous one
9. Consider the condition of the item (broken, intact, partially dismantled)
10. For devices with screens, note if they are CRT (more hazardous) or LCD/LED
11. For batteries, specify the type (lithium-ion, lead-acid, etc.) when possible
Classification Guidelines:
- Recyclable: Metals, plastics, glass components that can be processed
- Hazardous: Batteries, CRTs, items containing mercury or lead
- Refurbishable: Functional or repairable devices like phones, laptops
- Non-recyclable: Mixed materials that can't be separated, contaminated items
Examples of valid responses:
- {"wasteType":"lithium-ion batteries","quantity":"2 units","confidence":85,"hazardous":true,"classification":"hazardous","disposalInstructions":"Place in designated battery recycling bin. Do not incinerate.","recyclingValue":"25"}
- {"wasteType":"laptop","quantity":"1 unit","confidence":90,"hazardous":false,"classification":"refurbishable","disposalInstructions":"Remove personal data. Bring to e-waste recycling center for potential refurbishment.","recyclingValue":"90"}
- {"wasteType":"circuit boards","quantity":"0.5 kg","confidence":80,"hazardous":true,"classification":"hazardous","disposalInstructions":"Handle with care. Contains heavy metals. Professional recycling required.","recyclingValue":"35"}
- {"wasteType":"plastic computer casing","quantity":"1.2 kg","confidence":75,"hazardous":false,"classification":"recyclable","disposalInstructions":"Separate from other components. Can be processed as plastic recycling.","recyclingValue":"15"}
- {"wasteType":"none","quantity":"0","confidence":100,"hazardous":false,"classification":"non-recyclable","disposalInstructions":"Not e-waste","recyclingValue":"0"}
`
      const result = await model.generateContent([prompt, ...imageParts])
      const text = await result.response.text()
      const jsonStr = extractJsonFromText(text)
      const parsedResult = JSON.parse(jsonStr) as VerificationResultData
      if (parsedResult.wasteType === 'none') {
        setVerificationStatus('no_waste')
        toast.error('No e-waste detected. Please try another image.')
        return
      }
      setVerificationResult(parsedResult)
      setVerificationStatus('success')
      setNewReport(prev => ({
        ...prev,
        type: parsedResult.wasteType,
        amount: parsedResult.quantity,
      }))
    } catch (error) {
      console.error('Verification error:', error)
      setVerificationStatus('failure')
      toast.error('Verification failed. Please try again.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (verificationStatus !== 'success' || !user) {
      toast.error('Please verify waste and ensure you are logged in.')
      return
    }
    setIsSubmitting(true)
    try {
      const report = await createReport(
        user.id,
        newReport.location,
        newReport.type,
        newReport.amount,
        preview || '',
        verificationResult || undefined // Pass undefined instead of null
      )
      if (report) {
        const formattedReport: Report = {
          ...report,
          createdAt: report.createdAt,
          hazardous: verificationResult?.hazardous || false,
          verificationResult: verificationResult
        }
        setReports([formattedReport, ...reports])
        setQrValue(generateQrContent(formattedReport))
        setNewReport({ location: '', type: '', amount: '' })
        setFile(null)
        setPreview(null)
        setVerificationStatus('idle')
        toast.success('Report submitted! Print the QR code and attach it to the waste.')
        let normalizedWasteType = report.wasteType.toLowerCase().trim()
        if (normalizedWasteType.includes('mobile')) normalizedWasteType = 'mobile'
        if (normalizedWasteType.includes('laptop')) normalizedWasteType = 'laptop'
        if (normalizedWasteType.includes('tablet')) normalizedWasteType = 'tablet'
        if (normalizedWasteType.includes('desktop')) normalizedWasteType = 'desktop'
        if (normalizedWasteType.includes('monitor')) normalizedWasteType = 'monitor'
        if (normalizedWasteType.includes('notebook')) normalizedWasteType = 'notebook'
        if (normalizedWasteType.includes('ultrabook')) normalizedWasteType = 'ultrabook'
        if (normalizedWasteType.includes('computer')) normalizedWasteType = 'computer'
        const voucherAmount = DEVICE_VOUCHER_AMOUNTS[normalizedWasteType]
        if (voucherAmount) {
          addVoucher(normalizedWasteType, voucherAmount)
        }
      }
    } catch (error) {
      console.error('Submission error:', error)
      toast.error('Failed to submit report.')
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    const checkUser = async () => {
      const email = localStorage.getItem('userEmail')
      if (!email) return router.push('/login')
      let user = await getUserByEmail(email)
      if (!user) user = await createUser(email, 'Anonymous User')
      setUser(user)
      const recentReports = await getRecentReports()
      setReports(recentReports)
    }
    checkUser()
  }, [router])

  return (
    <>
      <div className="min-h-screen flex flex-col items-center bg-green-50">
        <header className="w-full py-6 bg-green-400 text-white text-center rounded-2xl">
          <div className="mx-auto max-w-4xl px-4">
            <h1 className="text-3xl font-bold">E-Waste Report</h1>
          </div>
        </header>
        <main className="flex-grow p-8 w-full max-w-4xl">
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-lg mb-12">
            <div className="mb-8">
              <label className="block text-lg font-medium text-gray-700 mb-2">Upload E-Waste Image</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500">
                      <span>Upload a file</span>
                      <input
                        type="file"
                        className="sr-only"
                        onChange={handleFileChange}
                        accept="image/*"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
              </div>
            </div>
            {preview && (
              <div className="mt-4 mb-8">
                <Image
                  src={preview}
                  alt="Preview"
                  width={500}
                  height={300}
                  className="max-w-full h-auto rounded-xl"
                />
              </div>
            )}
            <Button
              type="button"
              onClick={handleVerify}
              disabled={!file || verificationStatus === 'verifying'}
              className="w-full mb-8 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl"
            >
              {verificationStatus === 'verifying' ? (
                <>
                  <Loader className="animate-spin mr-2 h-4 w-4" />
                  Verifying...
                </>
              ) : 'Verify E-Waste'}
            </Button>
            {verificationStatus === 'success' && verificationResult && (
              <div className="bg-green-50 p-4 mb-8 rounded-lg">
                <h3 className="font-medium text-green-800">Verification Successful</h3>
                <p>Type: {verificationResult.wasteType}</p>
                <p>Quantity: {verificationResult.quantity}</p>
                <p>Confidence: {verificationResult.confidence}%</p>
                {verificationResult.hazardous && (
                  <p className="text-red-600">⚠️ Hazardous: Yes</p>
                )}
                {verificationResult.disposalInstructions && (
                  <p className="text-sm mt-2">Disposal: {verificationResult.disposalInstructions}</p>
                )}
              </div>
            )}
            {verificationStatus === 'no_waste' && (
              <div className="bg-yellow-50 p-4 mb-8 rounded-lg">
                <p className="text-yellow-800">No e-waste detected. Please try another image.</p>
              </div>
            )}
            {verificationStatus === 'failure' && (
              <div className="bg-red-50 p-4 mb-8 rounded-lg">
                <p className="text-red-800">Verification failed. Please try again.</p>
              </div>
            )}
            {qrValue && (
              <div className="bg-blue-50 p-4 mb-8 rounded-lg qr-printable">
                <h3 className="font-medium text-blue-800 mb-2">QR Code for Tracking</h3>
                <p className="text-sm text-blue-700 mb-3 text-center">
                  Scan this QR code with your mobile to view e-waste details
                </p>
                <div className="flex justify-center my-4 p-2 border-2 border-blue-200 rounded-lg bg-white">
                  <QRCodeSVG
                    value={qrValue}
                    size={160}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="H"
                  />
                </div>
                <div className="mb-4 text-center">
                  <p className="font-medium">Current Status:</p>
                  <div className={`inline-block px-3 py-1 rounded-full text-sm mt-1 ${reports.find(r => generateQrContent(r) === qrValue)?.status === 'completed' ? 'bg-green-100 text-green-800' :
                      reports.find(r => generateQrContent(r) === qrValue)?.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                    }`}>
                    {reports.find(r => generateQrContent(r) === qrValue)?.status || 'pending'}
                  </div>
                </div>
                <div className="mt-2 flex justify-center space-x-4">
                  <Button
                    onClick={() => window.print()}
                    className="bg-white border border-blue-500 text-blue-500 hover:bg-blue-50 py-2 rounded-lg"
                  >
                    Print QR Code
                  </Button>
                </div>
                <div className="mt-4 p-3 bg-blue-100 rounded-md text-sm">
                  <p className="font-medium mb-1">QR Code Contents Preview:</p>
                  <div className="bg-white p-2 rounded text-xs">
                    <pre className="whitespace-pre-wrap">{qrValue}</pre>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  name="location"
                  value={newReport.location}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 border rounded-lg"
                  placeholder="Enter location"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-Waste Type</label>
                <input
                  type="text"
                  name="type"
                  value={newReport.type}
                  readOnly
                  className="w-full p-2 border rounded-lg bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="text"
                  name="amount"
                  value={newReport.amount}
                  readOnly
                  className="w-full p-2 border rounded-lg bg-gray-100"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={isSubmitting || verificationStatus !== 'success'}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl"
            >
              {isSubmitting ? (
                <>
                  <Loader className="animate-spin mr-2 h-4 w-4" />
                  Submitting...
                </>
              ) : 'Submit E-Waste Report'}
            </Button>
          </form>
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <h2 className="p-4 text-xl font-semibold">Recent E-Waste Reports</h2>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left">ID</th>
                    <th className="px-6 py-3 text-left">Location</th>
                    <th className="px-6 py-3 text-left">Type</th>
                    <th className="px-6 py-3 text-left">Amount</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">QR Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reports.map((report) => (
                    <tr key={report.id} className={`hover:bg-gray-50 ${report.hazardous ? 'bg-red-50' : ''}`}>
                      <td className="px-6 py-4 font-medium">{report.id}</td>
                      <td className="px-6 py-4">{report.location}</td>
                      <td className="px-6 py-4">{report.wasteType}</td>
                      <td className="px-6 py-4">{report.amount}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${report.status === 'completed' ? 'bg-green-100 text-green-800' :
                            report.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                          }`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          onClick={() => setViewingQrReport(report)}
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          <QrCode className="h-4 w-4" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
      {showVoucherModal && currentVoucher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-green-700">🎉 Congratulations!</h3>
              <button
                onClick={() => setShowVoucherModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="mb-6 text-center">
              <p className="text-gray-700 mb-2">
                You&apos;ve earned a <strong>₹{currentVoucher.amount} discount</strong> for recycling your <strong>{currentVoucher.deviceType}</strong>!
              </p>
              <p className="text-gray-700 mb-4">
                Use this code at checkout on <strong>Flipkart, Amazon, or our partner stores</strong> to avail the discount on your next <strong>{currentVoucher.deviceType}</strong> purchase.
              </p>
              <div className="my-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-lg font-mono font-bold text-blue-700">
                  {currentVoucher.code}
                </p>
              </div>
              <div className="mt-4 flex justify-center space-x-4">
                <Button
                  onClick={() => copyToClipboard(currentVoucher.code)}
                  className="bg-green-500 hover:bg-green-600 text-white py-2 px-6 rounded-lg"
                >
                  Copy Code
                </Button>
                <Button
                  onClick={() => setShowVoucherModal(false)}
                  className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 px-6 rounded-lg"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {viewingQrReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">QR Code for Report #{viewingQrReport.id}</h3>
              <button
                onClick={() => setViewingQrReport(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="flex justify-center mb-4">
              <QRCodeSVG
                value={generateQrContent(viewingQrReport)}
                size={200}
                bgColor="#ffffff"
                fgColor="#000000"
                level="H"
              />
            </div>
            <div className="mb-4 text-center">
              <p className="font-medium">Current Status:</p>
              <div className={`inline-block px-3 py-1 rounded-full text-sm mt-1 ${viewingQrReport.status === 'completed' ? 'bg-green-100 text-green-800' :
                  viewingQrReport.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                }`}>
                {viewingQrReport.status}
              </div>
            </div>
            <div className="mt-4 flex justify-center">
              <Button
                onClick={() => window.print()}
                className="bg-white border border-blue-500 text-blue-500 hover:bg-blue-50"
              >
                Print QR Code
              </Button>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .qr-printable, .qr-printable * { visibility: visible; }
          .qr-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            text-align: center;
            padding: 20px;
          }
        }
      `}</style>
    </>
  )
}
