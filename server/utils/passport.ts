import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { User } from "@shared/schema";
import { verifyPassword } from "./auth";
import { storage } from "../storage";

// ============================================================
// PASSPORT CONFIGURATION
// ============================================================

/**
 * Serialize user for session storage
 */
passport.serializeUser<any, any>((user: User, done) => {
  done(null, user.id);
});

/**
 * Deserialize user from session
 */
passport.deserializeUser<any, any>(async (id: string, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

/**
 * Local Strategy for email/password authentication
 */
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);

        if (!user) {
          return done(null, false, { message: "User not found" });
        }

        if (!user.password) {
          return done(null, false, {
            message: "This account uses OAuth signin",
          });
        }

        const isPasswordValid = await verifyPassword(password, user.password);
        if (!isPasswordValid) {
          return done(null, false, { message: "Invalid password" });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

export default passport;
