"use client"

import { Box, Stack } from "@mui/material"

import { AllBlocks } from "./AllBlocks"
import { Subheading } from "@/components/Subheading"

export default function BlocksPage() {
  return (
    <Stack component="main" gap={2} paddingY={4}>
      <Subheading type="Blocks" />
      <Box sx={{ marginX: -2 }}>
        <AllBlocks open />
      </Box>
    </Stack>
  )
}
