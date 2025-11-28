export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <p className="text-center text-sm text-gray-600">
          © {currentYear} Stan Berteloot for Nytro Marketing
        </p>
      </div>
    </footer>
  );
}







