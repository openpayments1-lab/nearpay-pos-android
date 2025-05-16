import { useState } from "react";
import RefundUsingAPI from "@/components/RefundUsingAPI";

export default function RefundTest() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Dejavoo Refund Test
      </h1>
      
      <div className="max-w-lg mx-auto bg-white p-6 rounded-xl shadow-lg">
        <RefundUsingAPI />
      </div>
      
      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>This page tests direct integration with the Dejavoo SPIN API for refunds.</p>
        <p>Ensure your terminal is connected and properly configured.</p>
      </div>
    </div>
  );
}