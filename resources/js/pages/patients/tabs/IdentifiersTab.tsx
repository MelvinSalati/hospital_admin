export default function IdentifiersTab() {

    return (
        <div className="space-y-4">

            <h3 className="font-semibold">
                Patient Identifiers
            </h3>

            <button className="bg-green-600 text-white px-4 py-2 rounded">
                Register Fingerprint
            </button>

            <button className="bg-purple-600 text-white px-4 py-2 rounded">
                Register Face ID
            </button>

        </div>
    )
}
