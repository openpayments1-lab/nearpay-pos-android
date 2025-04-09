import { useCashRegister } from "@/lib/cashRegisterContext";

export default function ProcessingOverlay() {
  const { isProcessing, processingMessage, processingDetails } = useCashRegister();

  if (!isProcessing) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">{processingMessage}</h2>
        <p className="text-gray-600">{processingDetails}</p>
      </div>
    </div>
  );
}
