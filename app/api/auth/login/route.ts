import { NextResponse } from 'next/server';
import * as jose from 'jose';
import { cookies } from 'next/headers';

const ADMIN_USERNAME = 'berkmahim';
const ADMIN_PASSWORD = '3!a3&33H9Xyq#Jn#RxRSBtsmgC@';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const secret = new TextEncoder().encode(JWT_SECRET);

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const token = await new jose.SignJWT({ isAdmin: true })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1d')
        .sign(secret);
      
      const response = NextResponse.json({ success: true });
      
      // Set cookie
      const cookieStore = await cookies();
      cookieStore.set({
        name: 'admin_token',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 86400 // 1 day
      });

      return response;
    }

    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
