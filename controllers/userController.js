const registerUser = (req, res) => {
    const { name, email, password } = req.body;

    // Simple validation
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    // Normally, save user to DB here

    // Send success response
    res.status(201).json({ message: 'User registered successfully!' });
};

module.exports = { registerUser };
