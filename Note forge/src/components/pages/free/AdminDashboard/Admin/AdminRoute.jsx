import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import api from "./components/layout/api";

export default function AdminRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    api.get("/admin/check")
      .then(() => {
        setIsAdmin(true);
        setLoading(false);
      })
      .catch(() => {
        setIsAdmin(false);
        setLoading(false);
      });
  }, []);

  if (loading) return <h2>Checking access...</h2>;

  if (!isAdmin) return <Navigate to="/" />;

  return children;
}