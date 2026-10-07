import Link from 'next/link';
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';

export default function Header() {
  return (
    <header className="border-b py-2">
      <div className="container mx-auto flex flex-row justify-between items-center">
        <Link href="/" className="font-bold hover:underline">SAMS.</Link>
        <nav className="flex flex-row gap-2">
          <Show when="signed-in">
            <UserButton />
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button variant="outline">Sign In</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button variant="default">Sign Up</Button>
            </SignUpButton>
          </Show>
        </nav>
      </div>
    </header>
  )
}