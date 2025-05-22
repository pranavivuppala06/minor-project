# 🛒 Online Auction System

A web-based platform where **task creators** can post tasks and **bidders** can view and bid on them. Built with **Node.js**, **Express**, and **MongoDB**, this system features authentication, role-based dashboards, task uploads, and session management.

---

## 🚀 Features

### 🔐 Authentication
- User registration & login
- Session-based auth with roles: `creator` and `bidder`

### 📋 Creator Functionality
- Post new tasks with file uploads
- View all posted tasks
- Manage tasks from dashboard

### 🧾 Bidder Functionality
- View open tasks available to bid
- Access personal bidder dashboard

### 📦 Tech Stack
- **Backend:** Node.js, Express
- **Database:** MongoDB (via Mongoose)
- **Frontend:** HTML, CSS, JavaScript
- **File Uploads:** Multer

---

## 🛠️ Installation

### Prerequisites
- [Node.js](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/)

### Steps

```bash
# Clone the repository
git clone https://github.com/pranavivuppala06/minor-project.git
cd minor-project

# Install dependencies
npm install

# Create .env file
touch .env
