# ♻️ Bin.AI – Smart Waste Management & Rewards Platform

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Web3Auth](https://img.shields.io/badge/Web3Auth-3C3C3D?style=for-the-badge&logo=ethereum&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)

Bin.AI is a **smart waste management platform** that promotes sustainability through **AI-powered waste verification, real-time collection tracking, and Web3 authentication**.  
Users can upload waste details, track their submissions live, and earn **reward points** that can be redeemed for vouchers, making recycling both fun and rewarding.

---

## 🚀 Features

- 🗑 **AI Waste Verification** – Validate and categorize waste submissions using **Gemini AI**  
- 📍 **Real-Time Tracking** – Track waste collection status and monitor collector locations live  
- 🎁 **Reward System** – Earn points for responsible waste disposal and redeem rewards  
- 👤 **User Dashboard** – View submissions, history, and rewards  
- 🛍 **Vendor Portal** – Businesses can verify submissions and offer rewards  
- ♻️ **Collector Panel** – Assign tasks, optimize collection routes, and update statuses  
- 🔐 **Web3 Authentication** – Decentralized and secure login via Web3Auth  
- 🗄 **Database Management** – Built with Neon DB and Drizzle ORM for scalability  
- 🔔 **Real-Time Notifications** – Get instant updates on your waste submissions  

---

## 🛠️ Tech Stack

| Layer             | Technology                     |
|-------------------|--------------------------------|
| **Frontend**      | Next.js, Tailwind CSS          |
| **Authentication**| Web3Auth                        |
| **Database**      | PostgreSQL (Neon DB)           |
| **ORM**           | Drizzle ORM                    |
| **AI**            | Gemini AI                      |
| **Hosting**       | Vercel                         |
| **Tracking**      | Socket.IO, Leaflet.js          |


---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js v16+
- PostgreSQL / Neon DB account
- Web3Auth credentials
- Gemini AI API key

### Steps

```bash
# Clone the repository
git clone https://github.com/aritrachatterjee7/hh3_hackenzies.git

# Move into the project folder
cd hh3_hackenzies

# Install dependencies
npm install

# Create your .env file
touch .env
NEXT_PUBLIC_WEB3AUTH_KEY=your_web3auth_key
DATABASE_URL=your_neon_db_url
GEMINI_API_KEY=your_gemini_api_key
npm run dev


---

