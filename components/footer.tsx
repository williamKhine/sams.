import Link from "next/link";

export default function Footer() {
    return (
        <footer className="border-t py-2">
            <div className="container mx-auto">
                <p className="text-sm text-muted-foreground text-center">
                    © {new Date().getFullYear()} SAMS. All rights reserved. CPS714.&nbsp;
                    <Link href="/about" className="underline hover:text-accent-foreground">Group 8.</Link>
                </p>
            </div>
        </footer>
    )
}