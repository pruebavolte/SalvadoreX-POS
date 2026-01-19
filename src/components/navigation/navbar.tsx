import Link from "next/link";
import MaxWidthWrapper from "../global/max-width-wrapper";
import { buttonVariants } from "../ui/button";

const Navbar = () => {
    return (
        <header className="sticky top-0 inset-x-0 w-full h-14 border-b border-border/40 bg-background/50 backdrop-blur-md z-50">
            <MaxWidthWrapper>
                <div className="flex items-center justify-between w-full h-full">
                    <div className="flex">
                        <Link href="/" className="flex items-center font-semibold gap-2 text-lg">
                            <img src="/icons/logo.svg" alt="Logo SalvadoreX" className="w-8 h-8" />
                            SalvadoreX
                        </Link>
                    </div>

                    <div className="flex items-center gap-8">
                        <Link href="#" className={buttonVariants({ size: "sm" })}>
                            Agendar Demo
                        </Link>
                        <Link href="/login" className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700">
                            Iniciar sesion
                        </Link>
                    </div>
                </div>
            </MaxWidthWrapper>
        </header>
    )
};

export default Navbar
