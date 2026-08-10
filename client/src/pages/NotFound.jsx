import { Link } from "react-router-dom";
import { FiAlertTriangle } from "react-icons/fi";
import { Button } from "../components/ui/Primitives";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] gap-3 text-center">
      <FiAlertTriangle size={40} className="text-amber-400" />
      <h1 className="text-2xl font-extrabold">الصفحة غير موجودة</h1>
      <p className="text-mist-400">الصفحة التي تبحث عنها غير متوفرة.</p>
      <Link to="/">
        <Button className="mt-2">العودة إلى الرئيسية</Button>
      </Link>
    </div>
  );
}
