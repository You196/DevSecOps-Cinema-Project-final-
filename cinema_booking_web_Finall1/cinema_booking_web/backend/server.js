const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const { globalLimiter } = require("./middleware/securityMiddleware");
const { csrfProtection } = require("./middleware/csrfMiddleware");
const logger = require("./utils/logger");

// Route files
const authRoutes = require("./routes/authRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const filmRoutes = require("./routes/filmRoutes");

const Film = require("./models/Film");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = express();
const PORT = process.env.PORT || 5000;

// Fail fast if required environment variables are missing
const requiredEnvVars = [
  "MONGODB_URI",
  "JWT_SECRET",
  "CSRF_SECRET",
  "ENCRYPTION_KEY",
  "FRONTEND_URL",
  "NODE_ENV",
];
for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// Security Middlewares
app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use(express.json({ limit: "10kb" }));
app.use(globalLimiter);
app.use(csrfProtection);

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl} from ${req.ip}`);
  next();
});

// Mount routes
app.use("/auth", authRoutes);
app.use("/booking", bookingRoutes);
app.use("/movies", filmRoutes);

// Basic Route for testing
app.get("/", (req, res) => {
  res.send("Secure Cinema Booking API is running...");
});

// Centralized error handler
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}\nStack: ${err.stack}`);
  res.status(500).json({ error: "Server Error" });
});

const seedFilmsIfEmpty = async () => {
  const count = await Film.countDocuments();

  if (count === 0) {
    await Film.insertMany([
      {
        title: "Interstellar",
        genre: "Space • Epic • Drama",
        duration: 169,
        posterUrl:
          "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
        description:
          "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
      },
      {
        title: "The Batman",
        genre: "Crime • Mystery • Action",
        duration: 176,
        posterUrl:
          "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg",
        description:
          "When a sadistic serial killer begins murdering key political figures in Gotham, Batman is forced to investigate the city's hidden corruption and question his family's involvement.",
      },
      {
        title: "Dune",
        genre: "Science Fiction • Adventure",
        duration: 155,
        posterUrl:
          "https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
        description:
          "Paul Atreides, a brilliant and gifted young man born into a great destiny beyond his understanding, must travel to the most dangerous planet in the universe to ensure the future of his family and his people.",
      },
    ]);

    logger.info("Seeded MongoDB with dummy films.");
  }
};

const connectDB = async () => {
  try {
    let uri = process.env.MONGODB_URI;

    try {
      await mongoose.connect(uri);
      logger.info("Connected to MongoDB");

      await seedFilmsIfEmpty();
    } catch (mongoErr) {
      if (process.env.NODE_ENV !== "development") {
        logger.error(`Production DB connection failed: ${mongoErr.message}`);
        process.exit(1);
      }

      logger.warn(
        "Local MongoDB unavailable, starting in-memory database because NODE_ENV=development...",
      );
      const mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
      await mongoose.connect(uri);
      logger.info("Connected to In-Memory MongoDB");

      await seedFilmsIfEmpty();
    }

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (err) {
    logger.error(`Database connection error: ${err.message}`);
    process.exit(1);
  }
};

connectDB();
