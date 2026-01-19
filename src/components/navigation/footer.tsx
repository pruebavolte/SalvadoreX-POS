import React from "react"
import MaxWidthWrapper from "../global/max-width-wrapper";
import Link from "next/link";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const Footer = () => {
    return (
        <footer className="w-full relative bottom-0 border-t border-border pt-20 pb-8">
            <MaxWidthWrapper>
                <div className="flex flex-col md:flex-row items-start justify-between w-full">
                        <div className="flex flex-col items-start justify-between w-full max-w-md mr-auto">
                            <div className="flex items-center gap-2 mb-6 md:mb-0">
                                <img src="/images/logo_salvadorx.png" alt="Logo salvadorex" className="w-1/3" />
                            </div>
                            <div className="flex flex-col items-start mt-5">
                                <h2 className="text-lg font-semibold font-heading mb-2">
                                    Únete a nuestro boletín
                                </h2>
                                <p className="text-muted-foreground text-sm mb-4 text-center md:text-left">
                                    Suscríbete a nuestro boletín para recibir las últimas noticias y actualizaciones.
                                </p>
                                <form className="flex">
                                    <Input
                                        required
                                        type="email"
                                        placeholder="Ingresa tu correo"
                                        className="rounded-l-lg rounded-r-none border focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 h-9"
                                    />
                                    <Button
                                        type="submit"
                                        className="rounded-r-lg rounded-l-none hover:shadow-none hover:translate-y-0"
                                    >
                                        Recibir notificaciones
                                    </Button>
                                </form>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:text-left mt-8 gap-20">
                            <div>
                                <h3 className="font-semibold mb-2">
                                    Compañía
                                </h3>
                                <ul className="text-muted-foreground text-sm space-y-2">
                                    <li>
                                        <Link href="#" className="hover:text-foreground">
                                            Acerca de
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="#" className="hover:text-foreground">
                                            Servicios
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="#" className="hover:text-foreground">
                                            Carreras
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="#" className="hover:text-foreground">
                                            Resultados
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-2">
                                    Legal
                                </h3>
                                <ul className="text-muted-foreground text-sm space-y-2">
                                    <li>
                                        <Link href="#" className="hover:text-foreground">
                                            Ayuda
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="#" className="hover:text-foreground">
                                            Blog
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="#" className="hover:text-foreground">
                                            Privacidad
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="#" className="hover:text-foreground">
                                            Términos
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-neutral-200 mt-10 pt-6 flex items-center justify-between w-full">
                        <p className="text-start text-muted-foreground text-sm">
                            Todos los derechos reservados @{new Date().getFullYear()} SalvadoreX
                        </p>
                        <Button size="sm" variant="outline">
                            Comentarios
                        </Button>
                    </div>
            </MaxWidthWrapper>
        </footer>
    )
};

export default Footer
