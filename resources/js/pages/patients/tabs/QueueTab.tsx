export default function QueueTab({ patient }) {

    const assignQueue = () => {
        console.log("Assign to queue", patient.id)
    }

    return (
        <div className="space-y-4">

            <h3 className="text-lg font-semibold">
                Queue Management
            </h3>

            <button
                onClick={assignQueue}
                className="bg-blue-600 text-white px-4 py-2 rounded"
            >
                Assign To Next Queue
            </button>

        </div>
    )
}
