"use client"

import { Container, Stack } from "@mui/material"
import CssBaseline from "@mui/material/CssBaseline"
import { Experimental_CssVarsProvider as CssVarsProvider } from "@mui/material/styles"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Suspense } from "react"

import { ArweaveProvider } from "./ArweaveProvider"
import { theme } from "./theme"
import { Footer } from "../Footer"
import Header from "../Header"
import { NavigationEvents } from "../NavigationEvents"

const queryClient = new QueryClient()

export default function RootLayoutUI({ children }: { children: React.ReactNode }) {
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <CssVarsProvider theme={theme} defaultMode="light">
          <CssBaseline />
          <ArweaveProvider>
            <Stack>
              <Header />
              <Container maxWidth="xl" sx={{ minHeight: "calc(100vh - 101px)" }}>
                {children}
              </Container>
              <Footer />
            </Stack>
          </ArweaveProvider>
        </CssVarsProvider>
      </QueryClientProvider>
      <Suspense fallback={null}>
        <NavigationEvents />
      </Suspense>
    </>
  )
}
